"""SentinelAI — FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from app.config import get_settings
from app.database import init_db, async_session
from app.models import Organization
from app.routes import scan, policies, audit
from sqlalchemy import select

settings = get_settings()

# Structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.BoundLogger,
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    logger.info("sentinel_startup", environment=settings.environment)
    # Create tables and seed default org
    await init_db()
    async with async_session() as session:
        result = await session.execute(
            select(Organization).where(Organization.id == "00000000-0000-0000-0000-000000000001")
        )
        if not result.scalar_one_or_none():
            session.add(Organization(
                id="00000000-0000-0000-0000-000000000001",
                name="Default Organization",
                domain="localhost",
            ))
            await session.commit()
    logger.info("sentinel_db_ready")
    yield
    logger.info("sentinel_shutdown")


app = FastAPI(
    title="SentinelAI",
    description="Enterprise AI Data Loss Prevention Gateway",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(scan.router)
app.include_router(policies.router)
app.include_router(audit.router)


@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "environment": settings.environment,
        "services": {
            "api": "healthy",
            "detection_pipeline": "healthy",
        },
    }
