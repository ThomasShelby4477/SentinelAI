"""Exemptions API routes for SentinelAI."""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Exemption

router = APIRouter(prefix="/api/v1", tags=["exemptions"])

DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001"


class ExemptionCreate(BaseModel):
    allowed_text: str

class ExemptionResponse(BaseModel):
    id: str
    allowed_text: str
    created_at: str


@router.get("/exemptions", response_model=list[ExemptionResponse])
async def list_exemptions(db: AsyncSession = Depends(get_db)):
    """List all active exemptions for the organization."""
    result = await db.execute(select(Exemption).where(Exemption.org_id == DEFAULT_ORG_ID).order_by(Exemption.created_at.desc()))
    exemptions = result.scalars().all()
    return [
        ExemptionResponse(
            id=e.id,
            allowed_text=e.allowed_text,
            created_at=e.created_at
        ) for e in exemptions
    ]


@router.post("/exemptions", response_model=ExemptionResponse)
async def create_exemption(exemption: ExemptionCreate, db: AsyncSession = Depends(get_db)):
    """Create a new exemption to allow specific text through the detection pipeline."""
    # Check if exactly this text is already exempted
    existing = await db.execute(
        select(Exemption).where(
            Exemption.org_id == DEFAULT_ORG_ID,
            Exemption.allowed_text == exemption.allowed_text
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Exemption for this text already exists")

    new_exemption = Exemption(
        id=str(uuid.uuid4()),
        org_id=DEFAULT_ORG_ID,
        allowed_text=exemption.allowed_text,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    db.add(new_exemption)
    await db.commit()
    await db.refresh(new_exemption)

    return ExemptionResponse(
        id=new_exemption.id,
        allowed_text=new_exemption.allowed_text,
        created_at=new_exemption.created_at
    )


@router.delete("/exemptions/{exemption_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_exemption(exemption_id: str, db: AsyncSession = Depends(get_db)):
    """Revoke an exemption by its ID."""
    result = await db.execute(
        select(Exemption).where(
            Exemption.org_id == DEFAULT_ORG_ID,
            Exemption.id == exemption_id
        )
    )
    exemption = result.scalars().first()
    if not exemption:
        raise HTTPException(status_code=404, detail="Exemption not found")
    
    await db.delete(exemption)
    await db.commit()
