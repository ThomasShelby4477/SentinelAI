"""Audit log and analytics API routes."""

import json
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AuditEvent
from app.schemas import AuditEventResponse, AuditListResponse, AnalyticsSummary

router = APIRouter(prefix="/api/v1", tags=["audit"])

DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001"


@router.get("/audit/events", response_model=AuditListResponse)
async def list_audit_events(
    user_id: str | None = None,
    action: str | None = None,
    source: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List audit events with filtering and pagination."""
    query = select(AuditEvent).where(AuditEvent.org_id == DEFAULT_ORG_ID)

    if user_id:
        query = query.where(AuditEvent.user_id == user_id)
    if action:
        query = query.where(AuditEvent.action == action.upper())
    if source:
        query = query.where(AuditEvent.source == source)
    if from_date:
        query = query.where(AuditEvent.created_at >= from_date)
    if to_date:
        query = query.where(AuditEvent.created_at <= to_date)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.order_by(desc(AuditEvent.created_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    events = result.scalars().all()

    return AuditListResponse(
        total=total,
        page=page,
        page_size=page_size,
        events=[_event_to_response(e) for e in events],
    )


@router.get("/analytics/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    period: str = Query("7d", pattern="^(1d|7d|30d|90d)$"),
    db: AsyncSession = Depends(get_db),
):
    """Get analytics summary for the specified period."""
    days = {"1d": 1, "7d": 7, "30d": 30, "90d": 90}[period]
    since = datetime.now(timezone.utc) - timedelta(days=days)

    base_query = select(AuditEvent).where(
        AuditEvent.org_id == DEFAULT_ORG_ID,
        AuditEvent.created_at >= since,
    )

    # Totals by action
    action_counts = await db.execute(
        select(
            AuditEvent.action,
            func.count().label("count"),
        )
        .where(AuditEvent.org_id == DEFAULT_ORG_ID, AuditEvent.created_at >= since)
        .group_by(AuditEvent.action)
    )

    counts = {row.action: row.count for row in action_counts}
    total_scans = sum(counts.values())
    total_blocked = counts.get("BLOCK", 0)
    total_warned = counts.get("WARN", 0)
    total_allowed = counts.get("ALLOW", 0)

    # Top detection types
    all_events = await db.execute(
        select(AuditEvent.detections)
        .where(
            AuditEvent.org_id == DEFAULT_ORG_ID,
            AuditEvent.created_at >= since,
            AuditEvent.detections.isnot(None),
        )
    )
    type_counts: dict[str, int] = {}
    for (detections_raw,) in all_events:
        if detections_raw:
            try:
                detections = json.loads(detections_raw) if isinstance(detections_raw, str) else detections_raw
            except (json.JSONDecodeError, TypeError):
                continue
            for det in detections:
                det_type = det.get("type", "unknown")
                type_counts[det_type] = type_counts.get(det_type, 0) + 1

    top_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    # Top violators
    violators = await db.execute(
        select(
            AuditEvent.user_email,
            func.count().label("violations"),
        )
        .where(
            AuditEvent.org_id == DEFAULT_ORG_ID,
            AuditEvent.created_at >= since,
            AuditEvent.action.in_(["BLOCK", "WARN"]),
            AuditEvent.user_email.isnot(None),
        )
        .group_by(AuditEvent.user_email)
        .order_by(desc("violations"))
        .limit(10)
    )

    return AnalyticsSummary(
        total_scans=total_scans,
        total_blocked=total_blocked,
        total_warned=total_warned,
        total_allowed=total_allowed,
        block_rate=round(total_blocked / max(total_scans, 1), 4),
        top_detection_types=[{"type": t, "count": c} for t, c in top_types],
        scans_by_day=[],  # Would aggregate by date in production
        top_violators=[{"email": row.user_email, "violations": row.violations} for row in violators],
    )


def _event_to_response(event: AuditEvent) -> AuditEventResponse:
    detections = None
    if event.detections:
        try:
            detections = json.loads(event.detections) if isinstance(event.detections, str) else event.detections
        except (json.JSONDecodeError, TypeError):
            detections = None

    return AuditEventResponse(
        id=str(event.id),
        user_id=str(event.user_id) if event.user_id else None,
        user_email=event.user_email,
        source=event.source,
        destination=event.destination,
        action=event.action,
        risk_score=event.risk_score,
        detections=detections,
        policy_id=str(event.policy_id) if event.policy_id else None,
        prompt_snippet=event.prompt_snippet,
        ip_address=event.ip_address,
        latency_ms=event.latency_ms,
        created_at=event.created_at,
    )
