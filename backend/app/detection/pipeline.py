"""
Detection Pipeline Orchestrator — Coordinates all detection stages.

Runs: Encoding Decoder → Regex Engine → Code Classifier → Score Aggregation
and returns a unified scan result.
"""

import hashlib
import time
from dataclasses import dataclass, field

from app.config import get_settings
from app.detection.encoding_decoder import decode_text, DecodingResult
from app.detection.regex_engine import RegexEngine, Detection
from app.detection.code_classifier import CodeClassifier


@dataclass
class ScanResult:
    """Complete result of the detection pipeline."""
    risk_score: float
    action: str  # ALLOW, WARN, BLOCK
    detections: list[Detection]
    encoding_analysis: DecodingResult | None = None
    prompt_hash: str = ""
    latency_ms: int = 0
    policy_matched: str | None = None


class DetectionPipeline:
    """
    Orchestrates the full detection pipeline:
    
    1. Encoding Decoder (Base64, hex, URL, Unicode)
    2. Regex Pattern Engine (PII, secrets, credentials)
    3. Code Classifier (source code detection)
    4. Score Aggregation (weighted ensemble)
    """

    def __init__(self):
        self.settings = get_settings()
        self.regex_engine = RegexEngine()
        self.code_classifier = CodeClassifier()

    def scan(self, prompt: str, user_id: str | None = None) -> ScanResult:
        """
        Run the full detection pipeline on a prompt.
        
        Args:
            prompt: The text to scan.
            user_id: Optional user identifier for policy targeting.
            
        Returns:
            ScanResult with risk score, action, and detections.
        """
        start_time = time.perf_counter()

        # Compute prompt hash for deduplication / audit
        prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()

        all_detections: list[Detection] = []

        # ── Stage 1: Encoding Decoder ──────────────────────────────
        decode_result = decode_text(prompt)
        text_to_scan = decode_result.decoded

        # ── Stage 2: Regex Pattern Engine ──────────────────────────
        regex_detections = self.regex_engine.scan(text_to_scan)
        all_detections.extend(regex_detections)

        # If encoded content produced new detections, also scan original
        if decode_result.was_encoded:
            original_detections = self.regex_engine.scan(prompt)
            # Add any detections from original that weren't found in decoded
            existing_spans = {(d.start, d.end, d.type) for d in regex_detections}
            for det in original_detections:
                if (det.start, det.end, det.type) not in existing_spans:
                    all_detections.append(det)

        # ── Stage 3: Code Classifier ──────────────────────────────
        code_detections = self.code_classifier.scan(text_to_scan)
        all_detections.extend(code_detections)

        # ── Stage 4: Score Aggregation ────────────────────────────
        risk_score = self._aggregate_scores(all_detections)

        # ── Determine Action ──────────────────────────────────────
        if risk_score >= self.settings.score_threshold_block:
            action = "BLOCK"
        elif risk_score >= self.settings.score_threshold_warn:
            action = "WARN"
        else:
            action = "ALLOW"

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        return ScanResult(
            risk_score=round(risk_score, 4),
            action=action,
            detections=all_detections,
            encoding_analysis=decode_result,
            prompt_hash=prompt_hash,
            latency_ms=latency_ms,
        )

    def _aggregate_scores(self, detections: list[Detection]) -> float:
        """
        Weighted aggregation of detection scores.
        
        Uses max-confidence per detector type, then weighted average.
        Falls back to a severity-based boost if individual scores are low
        but multiple detections are present.
        """
        if not detections:
            return 0.0

        scores_by_detector: dict[str, float] = {}
        for det in detections:
            key = det.detector
            scores_by_detector[key] = max(scores_by_detector.get(key, 0.0), det.confidence)

        s = self.settings
        weighted_sum = 0.0
        weight_sum = 0.0

        weight_map = {
            "regex": s.weight_regex,
            "code_classifier": s.weight_code,
            "ner": s.weight_ner,
            "fingerprint": s.weight_fingerprint,
            "llm_classifier": s.weight_llm,
        }

        for detector, score in scores_by_detector.items():
            weight = weight_map.get(detector, 0.1)
            weighted_sum += score * weight
            weight_sum += weight

        if weight_sum == 0:
            return 0.0

        base_score = weighted_sum / weight_sum

        # Severity boost: multiple high/critical detections increase score
        critical_count = sum(1 for d in detections if d.severity.value in ("critical", "high"))
        if critical_count >= 3:
            base_score = min(base_score * 1.3, 1.0)
        elif critical_count >= 2:
            base_score = min(base_score * 1.15, 1.0)

        # Detection diversity boost: different categories increase score
        categories = {d.category for d in detections}
        if len(categories) >= 3:
            base_score = min(base_score * 1.2, 1.0)

        return round(min(base_score, 1.0), 4)
