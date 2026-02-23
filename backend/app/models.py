"""SQLAlchemy database models for SentinelAI — SQLite/PostgreSQL portable."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Boolean, Integer, Float, Text, DateTime,
    ForeignKey, UniqueConstraint, Table, JSON
)
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column


def new_uuid():
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


# ── Association Tables ──────────────────────────────────────────────

user_groups = Table(
    "user_groups",
    Base.metadata,
    Column("user_id", String(36), ForeignKey("users.id"), primary_key=True),
    Column("group_id", String(36), ForeignKey("groups.id"), primary_key=True),
)


# ── Organizations ───────────────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(String(50), default="enterprise")
    sso_provider: Mapped[str | None] = mapped_column(String(50))
    sso_metadata: Mapped[str | None] = mapped_column(Text)  # JSON as text for SQLite
    created_at: Mapped[str] = mapped_column(String(50), default=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Mapped[str] = mapped_column(String(50), default=lambda: datetime.now(timezone.utc).isoformat())

    users = relationship("User", back_populates="organization")
    groups = relationship("Group", back_populates="organization")
    policies = relationship("Policy", back_populates="organization")


# ── Users ───────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    external_id: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255))
    department: Mapped[str | None] = mapped_column(String(128))
    role: Mapped[str] = mapped_column(String(50), default="user")
    risk_level: Mapped[str] = mapped_column(String(50), default="normal")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[str] = mapped_column(String(50), default=lambda: datetime.now(timezone.utc).isoformat())

    __table_args__ = (UniqueConstraint("org_id", "external_id"),)

    organization = relationship("Organization", back_populates="users")
    groups = relationship("Group", secondary=user_groups, back_populates="members")


# ── Groups ──────────────────────────────────────────────────────────

class Group(Base):
    __tablename__ = "groups"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(255))

    __table_args__ = (UniqueConstraint("org_id", "name"),)

    organization = relationship("Organization", back_populates="groups")
    members = relationship("User", secondary=user_groups, back_populates="groups")


# ── Policies ────────────────────────────────────────────────────────

class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    priority: Mapped[int] = mapped_column(Integer, default=100)
    conditions: Mapped[str] = mapped_column(Text, nullable=False)  # JSON as text
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    applies_to: Mapped[str | None] = mapped_column(Text, default='{"all": true}')
    destinations: Mapped[str | None] = mapped_column(Text, default='{"all": true}')
    schedule: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    created_at: Mapped[str] = mapped_column(String(50), default=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: Mapped[str] = mapped_column(String(50), default=lambda: datetime.now(timezone.utc).isoformat())

    organization = relationship("Organization", back_populates="policies")


# ── Custom Patterns ─────────────────────────────────────────────────

class CustomPattern(Base):
    __tablename__ = "custom_patterns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    pattern: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    false_positive_rate: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[str] = mapped_column(String(50), default=lambda: datetime.now(timezone.utc).isoformat())


# ── Document Fingerprints ───────────────────────────────────────────

class DocFingerprint(Base):
    __tablename__ = "doc_fingerprints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    doc_name: Mapped[str] = mapped_column(String(512), nullable=False)
    simhash: Mapped[int] = mapped_column(Integer, nullable=False)
    classification: Mapped[str] = mapped_column(String(50), nullable=False)
    uploaded_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    created_at: Mapped[str] = mapped_column(String(50), default=lambda: datetime.now(timezone.utc).isoformat())


# ── API Keys ────────────────────────────────────────────────────────

class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(12), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    scopes: Mapped[str] = mapped_column(Text, default='["scan"]')
    rate_limit: Mapped[int] = mapped_column(Integer, default=1000)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    expires_at: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[str] = mapped_column(String(50), default=lambda: datetime.now(timezone.utc).isoformat())


# ── LLM Destinations ───────────────────────────────────────────────

class LLMDestination(Base):
    __tablename__ = "llm_destinations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str | None] = mapped_column(String(100))
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[str] = mapped_column(String(50), default=lambda: datetime.now(timezone.utc).isoformat())

    __table_args__ = (UniqueConstraint("org_id", "domain"),)


# ── Audit Events ────────────────────────────────────────────────────

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), nullable=False)
    user_id: Mapped[str | None] = mapped_column(String(36))
    user_email: Mapped[str | None] = mapped_column(String(320))
    source: Mapped[str] = mapped_column(String(50))
    destination: Mapped[str | None] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(20), nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    detections: Mapped[str | None] = mapped_column(Text)  # JSON as text
    policy_id: Mapped[str | None] = mapped_column(String(36))
    prompt_hash: Mapped[str | None] = mapped_column(String(64))
    prompt_snippet: Mapped[str | None] = mapped_column(String(200))
    session_id: Mapped[str | None] = mapped_column(String(100))
    device_id: Mapped[str | None] = mapped_column(String(100))
    ip_address: Mapped[str | None] = mapped_column(String(45))
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[str] = mapped_column(String(50), default=lambda: datetime.now(timezone.utc).isoformat())
