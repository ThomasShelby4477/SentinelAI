"""Policy CRUD API routes."""

import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Policy
from app.schemas import PolicyCreate, PolicyUpdate, PolicyResponse

router = APIRouter(prefix="/api/v1/policies", tags=["policies"])

# Default org ID for demo
DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001"


@router.get("", response_model=list[PolicyResponse])
async def list_policies(
    is_active: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all policies for the organization."""
    query = select(Policy).where(Policy.org_id == DEFAULT_ORG_ID)
    if is_active is not None:
        query = query.where(Policy.is_active == is_active)
    query = query.order_by(Policy.priority).offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    policies = result.scalars().all()
    return [_to_response(p) for p in policies]


@router.post("", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(data: PolicyCreate, db: AsyncSession = Depends(get_db)):
    """Create a new detection policy."""
    policy = Policy(
        id=str(uuid.uuid4()),
        org_id=DEFAULT_ORG_ID,
        name=data.name,
        description=data.description,
        is_active=data.is_active,
        priority=data.priority,
        conditions=json.dumps(data.conditions.model_dump()),
        action=data.action,
        applies_to=json.dumps(data.applies_to.model_dump()) if data.applies_to else '{"all": true}',
        destinations=json.dumps(data.destinations.model_dump()) if data.destinations else '{"all": true}',
        created_at=datetime.now(timezone.utc).isoformat(),
        updated_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(policy)
    await db.flush()
    return _to_response(policy)


@router.get("/{policy_id}", response_model=PolicyResponse)
async def get_policy(policy_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get a specific policy by ID."""
    result = await db.execute(
        select(Policy).where(Policy.id == policy_id, Policy.org_id == DEFAULT_ORG_ID)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return _to_response(policy)


@router.put("/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: uuid.UUID,
    data: PolicyUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing policy."""
    result = await db.execute(
        select(Policy).where(Policy.id == policy_id, Policy.org_id == DEFAULT_ORG_ID)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    update_data = data.model_dump(exclude_unset=True)
    if "conditions" in update_data and update_data["conditions"] is not None:
        update_data["conditions"] = json.dumps(data.conditions.model_dump())
    if "applies_to" in update_data and update_data["applies_to"] is not None:
        update_data["applies_to"] = json.dumps(data.applies_to.model_dump())
    if "destinations" in update_data and update_data["destinations"] is not None:
        update_data["destinations"] = json.dumps(data.destinations.model_dump())

    for key, value in update_data.items():
        setattr(policy, key, value)

    policy.version += 1
    policy.updated_at = datetime.now(timezone.utc).isoformat()
    await db.flush()
    return _to_response(policy)


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(policy_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Delete a policy."""
    result = await db.execute(
        select(Policy).where(Policy.id == policy_id, Policy.org_id == DEFAULT_ORG_ID)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    await db.delete(policy)


def _to_response(policy: Policy) -> PolicyResponse:
    def _parse_json(val):
        if isinstance(val, str):
            try:
                return json.loads(val)
            except (json.JSONDecodeError, TypeError):
                return {"all": True}
        return val or {"all": True}

    return PolicyResponse(
        id=str(policy.id),
        name=policy.name,
        description=policy.description,
        version=policy.version,
        is_active=policy.is_active,
        priority=policy.priority,
        conditions=_parse_json(policy.conditions),
        action=policy.action,
        applies_to=_parse_json(policy.applies_to),
        destinations=_parse_json(policy.destinations),
        created_at=policy.created_at,
        updated_at=policy.updated_at,
    )
