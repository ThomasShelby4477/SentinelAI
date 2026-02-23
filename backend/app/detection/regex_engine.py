"""
Regex Pattern Engine — Stage 2 of the SentinelAI detection pipeline.

High-speed compiled regex patterns for PII, secrets, credentials, and sensitive data.
Each pattern includes a category, severity, and optional validator for false-positive reduction.
"""

import re
import hashlib
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Category(str, Enum):
    PII = "PII"
    API_KEY = "API_KEY"
    TOKEN = "TOKEN"
    DB_CONNECTION = "DB_CONNECTION"
    SOURCE_CODE = "SOURCE_CODE"
    INTERNAL_URL = "INTERNAL_URL"
    FINANCIAL = "FINANCIAL"
    CREDENTIAL = "CREDENTIAL"


@dataclass
class Detection:
    """A single detection finding."""
    type: str
    category: Category
    severity: Severity
    detector: str
    span: str
    start: int
    end: int
    confidence: float
    metadata: dict = field(default_factory=dict)


@dataclass
class PatternDefinition:
    """Definition of a regex detection pattern."""
    name: str
    pattern: re.Pattern
    category: Category
    severity: Severity
    confidence: float
    validator: Callable[[str], bool] | None = None
    description: str = ""


# ── Validators ──────────────────────────────────────────────────────

def _luhn_check(number: str) -> bool:
    """Luhn algorithm for credit card validation."""
    digits = [int(d) for d in number if d.isdigit()]
    if len(digits) < 13:
        return False
    odd_digits = digits[-1::-2]
    even_digits = digits[-2::-2]
    total = sum(odd_digits)
    for d in even_digits:
        total += sum(divmod(d * 2, 10))
    return total % 10 == 0


def _aadhaar_check(number: str) -> bool:
    """Basic Aadhaar validation: 12 digits, doesn't start with 0 or 1."""
    digits = re.sub(r"\s", "", number)
    return len(digits) == 12 and digits[0] not in ("0", "1")


def _pan_check(value: str) -> bool:
    """PAN format: ABCDE1234F — 4th char indicates holder type."""
    return bool(re.match(r"^[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]$", value))


def _high_entropy(value: str) -> bool:
    """Check if string has high entropy (likely a real secret, not a placeholder)."""
    if len(value) < 8:
        return False
    import math
    freq = {}
    for ch in value:
        freq[ch] = freq.get(ch, 0) + 1
    length = len(value)
    entropy = -sum((c / length) * math.log2(c / length) for c in freq.values())
    return entropy > 3.0


# ── Pattern Registry ────────────────────────────────────────────────

BUILTIN_PATTERNS: list[PatternDefinition] = [
    # ── PII ──
    PatternDefinition(
        name="aadhaar_number",
        pattern=re.compile(r"\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b"),
        category=Category.PII,
        severity=Severity.CRITICAL,
        confidence=0.85,
        validator=_aadhaar_check,
        description="Indian Aadhaar number (12 digits)",
    ),
    PatternDefinition(
        name="pan_number",
        pattern=re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"),
        category=Category.PII,
        severity=Severity.HIGH,
        confidence=0.90,
        validator=_pan_check,
        description="Indian PAN card number",
    ),
    PatternDefinition(
        name="ssn",
        pattern=re.compile(r"\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b"),
        category=Category.PII,
        severity=Severity.CRITICAL,
        confidence=0.90,
        description="US Social Security Number",
    ),
    PatternDefinition(
        name="email_address",
        pattern=re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
        category=Category.PII,
        severity=Severity.MEDIUM,
        confidence=0.95,
        description="Email address",
    ),
    PatternDefinition(
        name="phone_number",
        pattern=re.compile(r"\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b"),
        category=Category.PII,
        severity=Severity.MEDIUM,
        confidence=0.60,
        description="US/IN phone number",
    ),
    PatternDefinition(
        name="indian_phone",
        pattern=re.compile(r"\b(?:\+91[-.\s]?)?[6-9]\d{4}[-.\s]?\d{5}\b"),
        category=Category.PII,
        severity=Severity.MEDIUM,
        confidence=0.75,
        description="Indian mobile number",
    ),

    # ── API Keys & Tokens ──
    PatternDefinition(
        name="openai_api_key",
        pattern=re.compile(r"\bsk-[a-zA-Z0-9]{20,}\b"),
        category=Category.API_KEY,
        severity=Severity.CRITICAL,
        confidence=0.95,
        description="OpenAI API key",
    ),
    PatternDefinition(
        name="aws_access_key",
        pattern=re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
        category=Category.API_KEY,
        severity=Severity.CRITICAL,
        confidence=0.95,
        description="AWS Access Key ID",
    ),
    PatternDefinition(
        name="aws_secret_key",
        pattern=re.compile(r"\b[A-Za-z0-9/+=]{40}\b"),
        category=Category.API_KEY,
        severity=Severity.CRITICAL,
        confidence=0.50,
        validator=_high_entropy,
        description="AWS Secret Access Key (high-entropy 40-char)",
    ),
    PatternDefinition(
        name="github_token",
        pattern=re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}\b"),
        category=Category.API_KEY,
        severity=Severity.CRITICAL,
        confidence=0.95,
        description="GitHub personal/OAuth token",
    ),
    PatternDefinition(
        name="slack_token",
        pattern=re.compile(r"\bxox[bpras]-[a-zA-Z0-9-]{10,}\b"),
        category=Category.API_KEY,
        severity=Severity.HIGH,
        confidence=0.95,
        description="Slack API token",
    ),
    PatternDefinition(
        name="google_api_key",
        pattern=re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
        category=Category.API_KEY,
        severity=Severity.HIGH,
        confidence=0.90,
        description="Google API key",
    ),
    PatternDefinition(
        name="stripe_key",
        pattern=re.compile(r"\b[sr]k_(live|test)_[a-zA-Z0-9]{20,}\b"),
        category=Category.API_KEY,
        severity=Severity.CRITICAL,
        confidence=0.95,
        description="Stripe API key",
    ),
    PatternDefinition(
        name="jwt_token",
        pattern=re.compile(r"\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\b"),
        category=Category.TOKEN,
        severity=Severity.HIGH,
        confidence=0.95,
        description="JSON Web Token",
    ),
    PatternDefinition(
        name="bearer_token",
        pattern=re.compile(r"(?i)(?:bearer|token|authorization)[\s:=]+['\"]?([a-zA-Z0-9_\-.]{20,})['\"]?"),
        category=Category.TOKEN,
        severity=Severity.HIGH,
        confidence=0.70,
        description="Bearer/Authorization token in header",
    ),

    # ── Database Connection Strings ──
    PatternDefinition(
        name="postgres_connection",
        pattern=re.compile(r"(?i)postgres(?:ql)?://[^\s'\"]{10,}"),
        category=Category.DB_CONNECTION,
        severity=Severity.CRITICAL,
        confidence=0.95,
        description="PostgreSQL connection string",
    ),
    PatternDefinition(
        name="mysql_connection",
        pattern=re.compile(r"(?i)mysql(?:\+\w+)?://[^\s'\"]{10,}"),
        category=Category.DB_CONNECTION,
        severity=Severity.CRITICAL,
        confidence=0.95,
        description="MySQL connection string",
    ),
    PatternDefinition(
        name="mongodb_connection",
        pattern=re.compile(r"(?i)mongodb(?:\+srv)?://[^\s'\"]{10,}"),
        category=Category.DB_CONNECTION,
        severity=Severity.CRITICAL,
        confidence=0.95,
        description="MongoDB connection string",
    ),
    PatternDefinition(
        name="redis_connection",
        pattern=re.compile(r"(?i)redis://[^\s'\"]{5,}"),
        category=Category.DB_CONNECTION,
        severity=Severity.HIGH,
        confidence=0.90,
        description="Redis connection string",
    ),
    PatternDefinition(
        name="generic_connection_string",
        pattern=re.compile(r"(?i)(?:Data Source|Server|Host)=[^;]+;(?:.*?(?:Password|Pwd)=[^;]+)"),
        category=Category.DB_CONNECTION,
        severity=Severity.CRITICAL,
        confidence=0.85,
        description="ADO.NET / ODBC connection string with password",
    ),

    # ── Internal URLs / Private IPs ──
    PatternDefinition(
        name="private_ipv4",
        pattern=re.compile(
            r"\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
            r"172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|"
            r"192\.168\.\d{1,3}\.\d{1,3})\b"
        ),
        category=Category.INTERNAL_URL,
        severity=Severity.MEDIUM,
        confidence=0.80,
        description="RFC1918 private IPv4 address",
    ),
    PatternDefinition(
        name="internal_url",
        pattern=re.compile(
            r"(?i)https?://[a-z0-9.-]*\.(?:internal|corp|local|intranet|private|staging|dev)\b[^\s]*"
        ),
        category=Category.INTERNAL_URL,
        severity=Severity.HIGH,
        confidence=0.90,
        description="Internal/corporate URL",
    ),

    # ── Financial ──
    PatternDefinition(
        name="credit_card",
        pattern=re.compile(
            r"\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{3,4}\b"
        ),
        category=Category.FINANCIAL,
        severity=Severity.CRITICAL,
        confidence=0.85,
        validator=_luhn_check,
        description="Credit/debit card number",
    ),
    PatternDefinition(
        name="iban",
        pattern=re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]?\d{0,16})\b"),
        category=Category.FINANCIAL,
        severity=Severity.HIGH,
        confidence=0.80,
        description="International Bank Account Number",
    ),
    PatternDefinition(
        name="indian_bank_account",
        pattern=re.compile(r"\b\d{9,18}\b"),  # Very broad — needs context validation
        category=Category.FINANCIAL,
        severity=Severity.LOW,
        confidence=0.20,
        description="Potential Indian bank account number (needs context)",
    ),

    # ── Credentials ──
    PatternDefinition(
        name="password_in_text",
        pattern=re.compile(r"(?i)(?:password|passwd|pwd|secret|token)[\s]*[:=]\s*['\"]?([^\s'\"]{8,})['\"]?"),
        category=Category.CREDENTIAL,
        severity=Severity.CRITICAL,
        confidence=0.80,
        description="Password or secret in plaintext assignment",
    ),
    PatternDefinition(
        name="private_key_header",
        pattern=re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
        category=Category.CREDENTIAL,
        severity=Severity.CRITICAL,
        confidence=0.99,
        description="Private key PEM header",
    ),
]


class RegexEngine:
    """Compiled regex engine that runs all patterns against input text."""

    def __init__(self, custom_patterns: list[PatternDefinition] | None = None):
        self.patterns = BUILTIN_PATTERNS.copy()
        if custom_patterns:
            self.patterns.extend(custom_patterns)

    def scan(self, text: str) -> list[Detection]:
        """Scan text against all patterns. Returns list of detections."""
        detections: list[Detection] = []

        for pdef in self.patterns:
            for match in pdef.pattern.finditer(text):
                matched_text = match.group(0)

                # Run validator for false-positive reduction
                if pdef.validator and not pdef.validator(matched_text):
                    continue

                detections.append(Detection(
                    type=pdef.name,
                    category=pdef.category,
                    severity=pdef.severity,
                    detector="regex",
                    span=matched_text[:100],  # Truncate to 100 chars for logging
                    start=match.start(),
                    end=match.end(),
                    confidence=pdef.confidence,
                    metadata={"description": pdef.description},
                ))

        return detections

    def get_max_score(self, detections: list[Detection]) -> float:
        """Return the highest confidence score from regex detections."""
        if not detections:
            return 0.0
        return max(d.confidence for d in detections)
