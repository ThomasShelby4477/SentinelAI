"""Scan API route — core endpoint for the AI-DLP detection pipeline."""

import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.schemas import ScanRequest, ScanResponse, DetectionItem
from app.detection.pipeline import DetectionPipeline
from app.models import AuditEvent

router = APIRouter(prefix="/api/v1", tags=["scan"])

# Singleton pipeline instance
_pipeline = DetectionPipeline()


@router.post("/scan", response_model=ScanResponse)
async def scan_prompt(request: ScanRequest, db: AsyncSession = Depends(get_db)):
    """
    Scan a prompt for sensitive data before it reaches an LLM.
    
    This is the core endpoint called by browser extensions, API gateways,
    reverse proxies, and endpoint agents.
    """
    settings = get_settings()

    # Enforce max prompt size
    if len(request.prompt.encode("utf-8")) > settings.max_prompt_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Prompt exceeds maximum size of {settings.max_prompt_size_bytes} bytes",
        )

    # Run detection pipeline
    result = _pipeline.scan(prompt=request.prompt, user_id=request.user_id)

    # Build response detections
    detections = [
        DetectionItem(
            type=d.type,
            category=d.category.value if hasattr(d.category, "value") else str(d.category),
            severity=d.severity.value if hasattr(d.severity, "value") else str(d.severity),
            detector=d.detector,
            span=d.span,
            confidence=round(d.confidence, 3),
        )
        for d in result.detections
    ]

    # Compose human-readable message
    if result.action == "BLOCK":
        types = list({d.type for d in detections})
        message = f"Blocked: detected {', '.join(types[:5])}. Contact your security team for exemptions."
    elif result.action == "WARN":
        message = "Warning: potentially sensitive data detected. Proceed with caution."
    else:
        message = ""

    # Log audit event
    audit_event = AuditEvent(
        id=str(uuid.uuid4()),
        org_id="00000000-0000-0000-0000-000000000001",
        user_id=request.user_id if request.user_id else None,
        user_email=None,
        source=request.source,
        destination=request.destination,
        action=result.action,
        risk_score=result.risk_score,
        detections=json.dumps([d.model_dump() for d in detections]) if detections else None,
        policy_id=None,
        prompt_hash=result.prompt_hash,
        prompt_snippet=request.prompt[:200] if settings.environment != "production" else "[redacted]",
        session_id=request.metadata.session_id if request.metadata else None,
        device_id=request.metadata.device_id if request.metadata else None,
        ip_address=request.metadata.ip if request.metadata else None,
        latency_ms=result.latency_ms,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(audit_event)

    return ScanResponse(
        request_id=request.request_id,
        action=result.action,
        risk_score=result.risk_score,
        detections=detections,
        policy_matched=result.policy_matched,
        message=message,
        latency_ms=result.latency_ms,
    )


def _is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except ValueError:
        return False
