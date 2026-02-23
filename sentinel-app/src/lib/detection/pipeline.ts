/**
 * SentinelAI Detection Pipeline — TypeScript Port
 * Regex engine with 25+ patterns for sensitive data detection.
 */

export interface Detection {
    type: string;
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    detector: string;
    span: string;
    confidence: number;
}

interface Pattern {
    name: string;
    regex: RegExp;
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    confidence: number;
    validator?: (match: string) => boolean;
}

// Luhn validator for credit cards
function luhnCheck(num: string): boolean {
    const digits = num.replace(/\D/g, "");
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let n = parseInt(digits[i], 10);
        if (alt) { n *= 2; if (n > 9) n -= 9; }
        sum += n;
        alt = !alt;
    }
    return sum % 10 === 0;
}

// Aadhaar Verhoeff validator (simplified check)
function aadhaarCheck(num: string): boolean {
    const digits = num.replace(/\D/g, "");
    return digits.length === 12 && digits[0] >= "2";
}

const PATTERNS: Pattern[] = [
    // PII
    { name: "aadhaar_number", regex: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g, category: "PII", severity: "critical", confidence: 0.95, validator: (m) => aadhaarCheck(m) },
    { name: "pan_number", regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g, category: "PII", severity: "high", confidence: 0.90 },
    { name: "ssn", regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g, category: "PII", severity: "critical", confidence: 0.95 },
    { name: "email_address", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, category: "PII", severity: "medium", confidence: 0.80 },
    { name: "phone_number", regex: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, category: "PII", severity: "medium", confidence: 0.70 },
    { name: "indian_phone", regex: /\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g, category: "PII", severity: "medium", confidence: 0.75 },

    // API Keys
    { name: "openai_api_key", regex: /\bsk-(?:proj-)?[a-zA-Z0-9]{20,}\b/g, category: "API_KEY", severity: "critical", confidence: 0.98 },
    { name: "aws_access_key", regex: /\bAKIA[0-9A-Z]{16}\b/g, category: "API_KEY", severity: "critical", confidence: 0.95 },
    { name: "github_token", regex: /\bghp_[a-zA-Z0-9]{36,}\b/g, category: "API_KEY", severity: "critical", confidence: 0.98 },
    { name: "github_oauth", regex: /\bgho_[a-zA-Z0-9]{36,}\b/g, category: "API_KEY", severity: "critical", confidence: 0.95 },
    { name: "google_api_key", regex: /\bAIza[0-9A-Za-z_-]{35}\b/g, category: "API_KEY", severity: "critical", confidence: 0.95 },
    { name: "stripe_key", regex: /\b[rs]k_(?:live|test)_[a-zA-Z0-9]{20,}\b/g, category: "API_KEY", severity: "critical", confidence: 0.95 },
    { name: "slack_token", regex: /\bxox[bpras]-[a-zA-Z0-9-]{10,}\b/g, category: "API_KEY", severity: "high", confidence: 0.90 },

    // Tokens
    { name: "jwt_token", regex: /\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\b/g, category: "TOKEN", severity: "high", confidence: 0.90 },
    { name: "bearer_token", regex: /\bBearer\s+[a-zA-Z0-9_.-]{20,}\b/g, category: "TOKEN", severity: "high", confidence: 0.85 },

    // Database Connections
    { name: "postgres_connection", regex: /postgres(?:ql)?:\/\/[^\s'"]{10,}/gi, category: "DB_CONNECTION", severity: "critical", confidence: 0.95 },
    { name: "mysql_connection", regex: /mysql:\/\/[^\s'"]{10,}/gi, category: "DB_CONNECTION", severity: "critical", confidence: 0.95 },
    { name: "mongodb_connection", regex: /mongodb(?:\+srv)?:\/\/[^\s'"]{10,}/gi, category: "DB_CONNECTION", severity: "critical", confidence: 0.95 },
    { name: "redis_connection", regex: /redis:\/\/[^\s'"]{10,}/gi, category: "DB_CONNECTION", severity: "critical", confidence: 0.90 },

    // Credentials
    { name: "private_key", regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g, category: "CREDENTIAL", severity: "critical", confidence: 0.99 },
    { name: "password_assignment", regex: /(?:password|passwd|pwd|secret)[\s]*[:=]\s*['"]?([^\s'"]{8,})['"]?/gi, category: "CREDENTIAL", severity: "critical", confidence: 0.85 },

    // Network
    { name: "private_ipv4", regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g, category: "INTERNAL_URL", severity: "medium", confidence: 0.80 },
    { name: "internal_url", regex: /https?:\/\/[a-z0-9.-]+\.(?:internal|corp|local|intra)\b[^\s]*/gi, category: "INTERNAL_URL", severity: "high", confidence: 0.85 },

    // Financial
    { name: "credit_card", regex: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6011)[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{3,4}\b/g, category: "FINANCIAL", severity: "critical", confidence: 0.90, validator: (m) => luhnCheck(m) },
    { name: "iban", regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g, category: "FINANCIAL", severity: "high", confidence: 0.85 },
];

export function runRegexEngine(text: string): Detection[] {
    const detections: Detection[] = [];

    for (const pattern of PATTERNS) {
        pattern.regex.lastIndex = 0; // Reset regex state
        const matches = text.matchAll(new RegExp(pattern.regex));

        for (const match of matches) {
            const span = match[0];
            if (pattern.validator && !pattern.validator(span)) continue;

            detections.push({
                type: pattern.name,
                category: pattern.category,
                severity: pattern.severity,
                detector: "regex",
                span: span.substring(0, 100),
                confidence: pattern.confidence,
            });
        }
    }

    return detections;
}

// Code detection heuristics
const CODE_SIGNATURES: Record<string, { keywords: string[]; structural: RegExp[] }> = {
    python: {
        keywords: ["def ", "import ", "class ", "self.", "print(", "__init__", "elif ", "lambda "],
        structural: [/^\s*def\s+\w+\s*\(/m, /^\s*class\s+\w+/m, /^\s*import\s+\w+/m],
    },
    javascript: {
        keywords: ["const ", "let ", "var ", "function ", "=> ", "require(", "module.exports", "async "],
        structural: [/^\s*(?:const|let|var)\s+\w+\s*=/m, /^\s*(?:export|import)\s+/m],
    },
    java: {
        keywords: ["public class", "private ", "protected ", "System.out", "void ", "throws ", "implements "],
        structural: [/^\s*public\s+class\s+\w+/m, /^\s*(?:public|private|protected)\s+\w+\s+\w+\s*\(/m],
    },
    sql: {
        keywords: ["SELECT ", "INSERT ", "UPDATE ", "DELETE ", "CREATE TABLE", "ALTER TABLE", "JOIN ", "WHERE "],
        structural: [/^\s*SELECT\s+.+\s+FROM\s+/im, /^\s*CREATE\s+TABLE/im],
    },
};

export function detectCode(text: string): Detection | null {
    for (const [lang, sig] of Object.entries(CODE_SIGNATURES)) {
        const keywordHits = sig.keywords.filter((kw) => text.includes(kw)).length;
        const structuralHits = sig.structural.filter((re) => re.test(text)).length;
        const score = keywordHits * 0.15 + structuralHits * 0.3;

        if (score >= 0.5) {
            return {
                type: `source_code_${lang}`,
                category: "SOURCE_CODE",
                severity: "high",
                detector: "code_classifier",
                span: text.substring(0, 100),
                confidence: Math.min(score, 0.95),
            };
        }
    }
    return null;
}

// Encoding decoder (simplified)
export function decodeText(text: string): string {
    let decoded = text;

    // URL decode
    try { decoded = decodeURIComponent(decoded); } catch { }

    // Base64 decode embedded segments
    const b64Pattern = /\b[A-Za-z0-9+/]{20,}={0,2}\b/g;
    decoded = decoded.replace(b64Pattern, (match) => {
        try {
            const result = atob(match);
            if (/^[\x20-\x7E]+$/.test(result)) return `${match} [decoded: ${result}]`;
        } catch { }
        return match;
    });

    // Unicode normalization
    decoded = decoded.normalize("NFKC");

    // Collapse whitespace tricks
    decoded = decoded.replace(/[\u200b\u200c\u200d\ufeff]/g, "");

    return decoded;
}

// Full pipeline
export interface ScanResult {
    action: "BLOCK" | "WARN" | "ALLOW";
    riskScore: number;
    detections: Detection[];
    latencyMs: number;
    message: string;
    promptHash: string;
}

export async function runPipeline(prompt: string): Promise<ScanResult> {
    const start = performance.now();

    // Stage 1: Decode
    const decoded = decodeText(prompt);

    // Stage 2: Regex scan
    const regexDetections = runRegexEngine(decoded);

    // Stage 3: Code classifier
    const codeDetection = detectCode(decoded);
    const detections = codeDetection ? [...regexDetections, codeDetection] : regexDetections;

    // Stage 4: Score aggregation
    const maxConf = detections.length ? Math.max(...detections.map((d) => d.confidence)) : 0;
    const severityBoost = detections.some((d) => d.severity === "critical") ? 0.1 : 0;
    const diversityBoost = new Set(detections.map((d) => d.category)).size * 0.02;
    const riskScore = Math.min(maxConf + severityBoost + diversityBoost + detections.length * 0.02, 1.0);

    const action = riskScore >= 0.7 ? "BLOCK" : riskScore >= 0.3 ? "WARN" : "ALLOW";

    const latencyMs = Math.round(performance.now() - start);

    // Simple hash
    const encoder = new TextEncoder();
    const data = encoder.encode(prompt);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const promptHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    const detectedTypes = [...new Set(detections.map((d) => d.type))].slice(0, 3);
    const message =
        action === "BLOCK"
            ? `Blocked: detected ${detectedTypes.join(", ")}. Contact your security team for exemptions.`
            : action === "WARN"
                ? "Warning: potentially sensitive data detected in prompt."
                : "No sensitive data detected.";

    return { action, riskScore: parseFloat(riskScore.toFixed(4)), detections, latencyMs, message, promptHash };
}
