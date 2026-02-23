"""Pydantic schemas for request/response validation."""

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


# ── Scan API ────────────────────────────────────────────────────────

class ScanMetadata(BaseModel):
    app: Optional[str] = None
    session_id: Optional[str] = None
    device_id: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None


class ScanRequest(BaseModel):
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    source: str = Field(..., pattern="^(browser_extension|api_gateway|proxy|endpoint_agent)$")
    destination: Optional[str] = None
    prompt: str = Field(..., min_length=1, max_length=102400)
    metadata: Optional[ScanMetadata] = None


class DetectionItem(BaseModel):
    type: str
    category: str
    severity: str
    detector: str
    span: str
    confidence: float


class ScanResponse(BaseModel):
    request_id: str
    action: str
    risk_score: float
    detections: list[DetectionItem]
    policy_matched: Optional[str] = None
    message: str = ""
    latency_ms: int = 0


# ── Policy API ──────────────────────────────────────────────────────

class PolicyConditions(BaseModel):
    detectors: list[str] = Field(default_factory=lambda: ["pii", "api_key"])
    min_score: float = 0.7
    sources: Optional[list[str]] = None


class PolicyAppliesTo(BaseModel):
    all: bool = True
    groups: Optional[list[str]] = None
    users: Optional[list[str]] = None
    departments: Optional[list[str]] = None


class PolicyDestinations(BaseModel):
    all: bool = True
    domains: Optional[list[str]] = None


class PolicyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_active: bool = True
    priority: int = Field(default=100, ge=1, le=10000)
    conditions: PolicyConditions
    action: str = Field(..., pattern="^(BLOCK|WARN|REDACT|LOG_ONLY)$")
    applies_to: Optional[PolicyAppliesTo] = None
    destinations: Optional[PolicyDestinations] = None


class PolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    conditions: Optional[PolicyConditions] = None
    action: Optional[str] = None
    applies_to: Optional[PolicyAppliesTo] = None
    destinations: Optional[PolicyDestinations] = None


class PolicyResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    version: int
    is_active: bool
    priority: int
    conditions: dict
    action: str
    applies_to: dict
    destinations: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Audit API ───────────────────────────────────────────────────────

class AuditEventResponse(BaseModel):
    id: str
    user_id: Optional[str]
    user_email: Optional[str]
    source: str
    destination: Optional[str]
    action: str
    risk_score: float
    detections: Optional[list[dict]]
    policy_id: Optional[str]
    prompt_snippet: Optional[str]
    ip_address: Optional[str]
    latency_ms: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    events: list[AuditEventResponse]


# ── Analytics API ───────────────────────────────────────────────────

class AnalyticsSummary(BaseModel):
    total_scans: int
    total_blocked: int
    total_warned: int
    total_allowed: int
    block_rate: float
    top_detection_types: list[dict]
    scans_by_day: list[dict]
    top_violators: list[dict]


# ── Auth ────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: Optional[str]
    department: Optional[str]
    role: str
    risk_level: str
    is_active: bool

    model_config = {"from_attributes": True}


# ── Health ──────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    environment: str
    services: dict
