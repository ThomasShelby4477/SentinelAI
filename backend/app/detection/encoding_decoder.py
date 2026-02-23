"""
Encoding Decoder — Stage 1 of the SentinelAI detection pipeline.

Recursively decodes obfuscated content (Base64, hex, URL-encoding, Unicode confusables)
so downstream detectors operate on plaintext.
"""

import base64
import binascii
import math
import re
import urllib.parse
import unicodedata
from dataclasses import dataclass, field


@dataclass
class DecodingResult:
    """Result of the decoding pipeline."""
    original: str
    decoded: str
    transformations: list[str] = field(default_factory=list)
    entropy_original: float = 0.0
    entropy_decoded: float = 0.0
    was_encoded: bool = False


# ── Unicode confusable normalization ────────────────────────────────

# Cyrillic → Latin lookalike map (most common homoglyphs)
_CONFUSABLE_MAP = {
    "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0440": "p",
    "\u0441": "c", "\u0443": "y", "\u0445": "x", "\u0456": "i",
    "\u0458": "j", "\u04bb": "h", "\u0455": "s", "\u0442": "t",
    "\u043d": "h", "\u0432": "b", "\u043c": "m",
    "\u0410": "A", "\u0412": "B", "\u0415": "E", "\u041a": "K",
    "\u041c": "M", "\u041d": "H", "\u041e": "O", "\u0420": "P",
    "\u0421": "C", "\u0422": "T", "\u0425": "X",
    # Fullwidth ASCII → normal ASCII
    **{chr(0xFF01 + i): chr(0x21 + i) for i in range(94)},
}


def _normalize_confusables(text: str) -> tuple[str, bool]:
    """Replace Unicode confusables with their ASCII equivalents."""
    changed = False
    chars = []
    for ch in text:
        replacement = _CONFUSABLE_MAP.get(ch)
        if replacement:
            chars.append(replacement)
            changed = True
        else:
            chars.append(ch)
    return "".join(chars), changed


def _normalize_unicode(text: str) -> tuple[str, bool]:
    """Apply NFC normalization + confusable replacement."""
    normalized = unicodedata.normalize("NFC", text)
    result, confusable_changed = _normalize_confusables(normalized)
    changed = (normalized != text) or confusable_changed
    return result, changed


# ── Shannon entropy ─────────────────────────────────────────────────

def shannon_entropy(data: str) -> float:
    """Calculate Shannon entropy of a string."""
    if not data:
        return 0.0
    freq = {}
    for ch in data:
        freq[ch] = freq.get(ch, 0) + 1
    length = len(data)
    return -sum((count / length) * math.log2(count / length) for count in freq.values())


# ── Individual decoders ─────────────────────────────────────────────

_BASE64_PATTERN = re.compile(
    r"(?:[A-Za-z0-9+/]{4}){2,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})"
)

_HEX_PATTERN = re.compile(r"(?:0x)?([0-9a-fA-F]{2}(?:\s?[0-9a-fA-F]{2}){3,})")

_URL_ENCODED_PATTERN = re.compile(r"(?:%[0-9a-fA-F]{2}){3,}")


def _try_base64_decode(text: str) -> tuple[str, bool]:
    """Find and decode Base64 segments within the text."""
    changed = False

    def _replace(m: re.Match) -> str:
        nonlocal changed
        try:
            decoded_bytes = base64.b64decode(m.group(0))
            decoded_str = decoded_bytes.decode("utf-8", errors="strict")
            # Only accept if result is mostly printable
            printable_ratio = sum(1 for c in decoded_str if c.isprintable() or c.isspace()) / max(len(decoded_str), 1)
            if printable_ratio > 0.7 and len(decoded_str) >= 3:
                changed = True
                return decoded_str
        except (binascii.Error, UnicodeDecodeError, ValueError):
            pass
        return m.group(0)

    result = _BASE64_PATTERN.sub(_replace, text)
    return result, changed


def _try_hex_decode(text: str) -> tuple[str, bool]:
    """Find and decode hex-encoded segments."""
    changed = False

    def _replace(m: re.Match) -> str:
        nonlocal changed
        hex_str = m.group(1) if m.group(1) else m.group(0)
        hex_str = hex_str.replace(" ", "")
        try:
            decoded_bytes = bytes.fromhex(hex_str)
            decoded_str = decoded_bytes.decode("utf-8", errors="strict")
            printable_ratio = sum(1 for c in decoded_str if c.isprintable() or c.isspace()) / max(len(decoded_str), 1)
            if printable_ratio > 0.7 and len(decoded_str) >= 3:
                changed = True
                return decoded_str
        except (ValueError, UnicodeDecodeError):
            pass
        return m.group(0)

    result = _HEX_PATTERN.sub(_replace, text)
    return result, changed


def _try_url_decode(text: str) -> tuple[str, bool]:
    """Decode URL-encoded sequences."""
    decoded = urllib.parse.unquote(text)
    changed = decoded != text
    return decoded, changed


def _collapse_whitespace(text: str) -> str:
    """Collapse excessive whitespace that may be used for obfuscation.
    
    e.g., 'A K I A 1 2 3 4' → 'AKIA1234' when individual chars are space-separated.
    """
    # Detect single-char-space-single-char pattern (letter-by-letter spelling)
    # Match sequences of single non-space chars separated by spaces
    pattern = re.compile(r"(?<!\S)(\S) (\S) (\S) (\S(?:\s\S){2,})(?!\S)")

    def _join(m: re.Match) -> str:
        return m.group(0).replace(" ", "")

    return pattern.sub(_join, text)


# ── Main decoder pipeline ──────────────────────────────────────────

def decode_text(text: str, max_passes: int = 3) -> DecodingResult:
    """
    Multi-pass decoding pipeline.
    
    Recursively applies: URL-decode → Base64-decode → Hex-decode → Unicode-normalize
    up to `max_passes` iterations or until no further changes are detected.
    """
    result = DecodingResult(
        original=text,
        decoded=text,
        entropy_original=shannon_entropy(text),
    )

    current = text

    for pass_num in range(1, max_passes + 1):
        changed_this_pass = False

        # 1. URL decode
        current, ch = _try_url_decode(current)
        if ch:
            result.transformations.append(f"pass{pass_num}:url_decode")
            changed_this_pass = True

        # 2. Base64 decode
        current, ch = _try_base64_decode(current)
        if ch:
            result.transformations.append(f"pass{pass_num}:base64_decode")
            changed_this_pass = True

        # 3. Hex decode
        current, ch = _try_hex_decode(current)
        if ch:
            result.transformations.append(f"pass{pass_num}:hex_decode")
            changed_this_pass = True

        # 4. Unicode normalization
        current, ch = _normalize_unicode(current)
        if ch:
            result.transformations.append(f"pass{pass_num}:unicode_normalize")
            changed_this_pass = True

        if not changed_this_pass:
            break

    # 5. Collapse obfuscation whitespace (single pass, post-decode)
    collapsed = _collapse_whitespace(current)
    if collapsed != current:
        result.transformations.append("whitespace_collapse")
        current = collapsed

    result.decoded = current
    result.entropy_decoded = shannon_entropy(current)
    result.was_encoded = len(result.transformations) > 0

    return result
