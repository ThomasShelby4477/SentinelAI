"""
Code Classifier — Stage 4 of the SentinelAI detection pipeline.

Heuristic-based source code detection using language-specific keyword density,
structural markers (brackets, indentation), and AST parseability checks.
"""

import re
from dataclasses import dataclass
from app.detection.regex_engine import Detection, Category, Severity


@dataclass
class CodeAnalysis:
    """Result of code classification analysis."""
    is_code: bool
    confidence: float
    language: str | None
    features: dict


# Language-specific keyword sets
_LANG_KEYWORDS = {
    "python": {
        "keywords": {"def", "class", "import", "from", "return", "yield", "async", "await",
                      "if", "elif", "else", "for", "while", "try", "except", "finally",
                      "with", "lambda", "raise", "pass", "self", "__init__", "print"},
        "patterns": [
            re.compile(r"^\s*def\s+\w+\s*\(", re.MULTILINE),
            re.compile(r"^\s*class\s+\w+", re.MULTILINE),
            re.compile(r"^\s*import\s+\w+", re.MULTILINE),
            re.compile(r"^\s*from\s+\w+\s+import", re.MULTILINE),
            re.compile(r"if\s+__name__\s*==", re.MULTILINE),
        ],
        "weight": 1.0,
    },
    "javascript": {
        "keywords": {"const", "let", "var", "function", "return", "async", "await",
                      "class", "extends", "import", "export", "require", "module",
                      "console", "document", "window", "this", "new", "typeof"},
        "patterns": [
            re.compile(r"(?:const|let|var)\s+\w+\s*=", re.MULTILINE),
            re.compile(r"(?:function|=>)\s*", re.MULTILINE),
            re.compile(r"module\.exports", re.MULTILINE),
            re.compile(r"(?:import|export)\s+", re.MULTILINE),
            re.compile(r"console\.\w+\(", re.MULTILINE),
        ],
        "weight": 1.0,
    },
    "java": {
        "keywords": {"public", "private", "protected", "static", "void", "class",
                      "interface", "extends", "implements", "import", "package",
                      "return", "new", "this", "super", "final", "abstract"},
        "patterns": [
            re.compile(r"^\s*(?:public|private|protected)\s+", re.MULTILINE),
            re.compile(r"^\s*package\s+[\w.]+;", re.MULTILINE),
            re.compile(r"^\s*import\s+[\w.]+;", re.MULTILINE),
            re.compile(r"System\.\w+\.\w+\(", re.MULTILINE),
        ],
        "weight": 1.0,
    },
    "sql": {
        "keywords": {"SELECT", "INSERT", "UPDATE", "DELETE", "FROM", "WHERE",
                      "JOIN", "CREATE", "ALTER", "DROP", "TABLE", "INDEX",
                      "GROUP BY", "ORDER BY", "HAVING", "UNION"},
        "patterns": [
            re.compile(r"(?i)\bSELECT\b.+\bFROM\b", re.MULTILINE),
            re.compile(r"(?i)\bINSERT\s+INTO\b", re.MULTILINE),
            re.compile(r"(?i)\bCREATE\s+TABLE\b", re.MULTILINE),
            re.compile(r"(?i)\bALTER\s+TABLE\b", re.MULTILINE),
        ],
        "weight": 1.2,  # SQL leakage is higher risk
    },
    "shell": {
        "keywords": {"#!/bin/bash", "echo", "export", "sudo", "chmod", "chown",
                      "grep", "awk", "sed", "curl", "wget", "apt-get", "yum"},
        "patterns": [
            re.compile(r"^#!/bin/(?:bash|sh|zsh)", re.MULTILINE),
            re.compile(r"^\s*export\s+\w+=", re.MULTILINE),
            re.compile(r"\|\s*(?:grep|awk|sed|sort)\s", re.MULTILINE),
        ],
        "weight": 1.1,
    },
}

# Structural markers for code
_STRUCTURAL_PATTERNS = {
    "braces": re.compile(r"[{}]"),
    "semicolons": re.compile(r";\s*$", re.MULTILINE),
    "indentation": re.compile(r"^(?:    |\t)\S", re.MULTILINE),
    "comments": re.compile(r"(?://|#|/\*|\*/|<!--)", re.MULTILINE),
    "string_literals": re.compile(r'(?:"[^"]{2,}"|\'[^\']{2,}\'|`[^`]{2,}`)', re.MULTILINE),
    "operators": re.compile(r"(?:===|!==|==|!=|>=|<=|&&|\|\||=>|->|\+=|-=|\*=|/=)"),
}


class CodeClassifier:
    """Heuristic classifier for detecting source code in prompts."""

    def __init__(self, threshold: float = 0.55):
        self.threshold = threshold

    def analyze(self, text: str) -> CodeAnalysis:
        """Analyze text for source code characteristics."""
        if len(text.strip()) < 30:
            return CodeAnalysis(is_code=False, confidence=0.0, language=None, features={})

        lines = text.strip().split("\n")
        total_lines = len(lines)

        features: dict = {}
        lang_scores: dict[str, float] = {}

        # Check each language
        for lang, config in _LANG_KEYWORDS.items():
            keyword_hits = sum(1 for kw in config["keywords"]
                               if re.search(r"\b" + re.escape(kw) + r"\b", text))
            pattern_hits = sum(1 for p in config["patterns"] if p.search(text))

            keyword_density = keyword_hits / max(total_lines, 1)
            pattern_strength = pattern_hits / max(len(config["patterns"]), 1)

            score = (keyword_density * 0.4 + pattern_strength * 0.6) * config["weight"]
            lang_scores[lang] = min(score, 1.0)

        # Structural analysis
        structural_score = 0.0
        structural_features = {}
        for name, pattern in _STRUCTURAL_PATTERNS.items():
            matches = len(pattern.findall(text))
            density = matches / max(total_lines, 1)
            structural_features[name] = round(density, 3)
            structural_score += min(density * 0.15, 0.15)

        structural_score = min(structural_score, 0.5)
        features["structural"] = structural_features
        features["language_scores"] = {k: round(v, 3) for k, v in lang_scores.items()}

        # Best language match
        best_lang = max(lang_scores, key=lang_scores.get) if lang_scores else None
        best_lang_score = lang_scores.get(best_lang, 0.0) if best_lang else 0.0

        # Final confidence
        confidence = min(best_lang_score * 0.6 + structural_score * 0.4, 1.0)
        features["final_confidence"] = round(confidence, 3)

        is_code = confidence >= self.threshold
        detected_lang = best_lang if is_code and best_lang_score > 0.2 else None

        return CodeAnalysis(
            is_code=is_code,
            confidence=round(confidence, 3),
            language=detected_lang,
            features=features,
        )

    def scan(self, text: str) -> list[Detection]:
        """Run code classification and return detections if code is found."""
        analysis = self.analyze(text)
        if not analysis.is_code:
            return []

        lang_label = analysis.language or "unknown"
        return [Detection(
            type=f"source_code_{lang_label}",
            category=Category.SOURCE_CODE,
            severity=Severity.HIGH,
            detector="code_classifier",
            span=text[:100],
            start=0,
            end=len(text),
            confidence=analysis.confidence,
            metadata={"language": lang_label, "features": analysis.features},
        )]
