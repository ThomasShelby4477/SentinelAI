/**
 * SentinelAI Browser Extension — Background Service Worker
 * 
 * Updated to work with Vercel deployment.
 * Change SENTINEL_API to your Vercel deployment URL.
 */

// ⚠️ CHANGE THIS to your Vercel deployment URL after deploying
const SENTINEL_API = 'https://your-app.vercel.app/api';

// Extension state
let isEnabled = true;
let stats = { scanned: 0, blocked: 0, warned: 0 };

chrome.storage.local.get(['isEnabled', 'stats', 'apiUrl'], (data) => {
    if (data.isEnabled !== undefined) isEnabled = data.isEnabled;
    if (data.stats) stats = data.stats;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCAN_PROMPT') {
        handleScan(message.data, sender.tab).then(sendResponse);
        return true;
    }
    if (message.type === 'GET_STATUS') {
        sendResponse({ isEnabled, stats });
        return false;
    }
    if (message.type === 'TOGGLE_ENABLED') {
        isEnabled = message.enabled;
        chrome.storage.local.set({ isEnabled });
        sendResponse({ isEnabled });
        return false;
    }
    if (message.type === 'SET_API_URL') {
        chrome.storage.local.set({ apiUrl: message.url });
        sendResponse({ ok: true });
        return false;
    }
});

async function getApiUrl() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['apiUrl'], (data) => {
            resolve(data.apiUrl || SENTINEL_API);
        });
    });
}

async function handleScan(data, tab) {
    if (!isEnabled) return { action: 'ALLOW', detections: [] };
    stats.scanned++;

    const apiUrl = await getApiUrl();

    try {
        const response = await fetch(`${apiUrl}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source: 'browser_extension',
                destination: new URL(tab?.url || '').hostname,
                prompt: data.prompt,
                metadata: { app: data.app || 'unknown', user_agent: navigator.userAgent }
            })
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const result = await response.json();

        if (result.action === 'BLOCK') stats.blocked++;
        if (result.action === 'WARN') stats.warned++;
        chrome.storage.local.set({ stats });
        return result;

    } catch (err) {
        console.warn('[SentinelAI] API unreachable, running client-side detection:', err.message);
        return runLocalDetection(data.prompt);
    }
}

function runLocalDetection(text) {
    const detections = [];
    const patterns = [
        { name: 'Aadhaar', regex: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g, severity: 'critical' },
        { name: 'PAN', regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g, severity: 'high' },
        { name: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/g, severity: 'critical' },
        { name: 'API Key (OpenAI)', regex: /\bsk-[a-zA-Z0-9]{20,}\b/g, severity: 'critical' },
        { name: 'AWS Key', regex: /\bAKIA[0-9A-Z]{16}\b/g, severity: 'critical' },
        { name: 'JWT Token', regex: /\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\b/g, severity: 'high' },
        { name: 'DB Connection', regex: /(?:postgres|mysql|mongodb|redis):\/\/[^\s]{10,}/gi, severity: 'critical' },
        { name: 'Private Key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, severity: 'critical' },
        { name: 'Private IP', regex: /\b(?:10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)\b/g, severity: 'medium' },
    ];

    for (const p of patterns) {
        for (const m of text.matchAll(p.regex)) {
            detections.push({ type: p.name, severity: p.severity, detector: 'regex', span: m[0].substring(0, 60), confidence: 0.9 });
        }
    }

    if (detections.length) stats.blocked++;
    chrome.storage.local.set({ stats });

    return {
        action: detections.some(d => d.severity === 'critical') ? 'BLOCK' : detections.length ? 'WARN' : 'ALLOW',
        risk_score: detections.length ? 0.85 : 0,
        detections,
        message: detections.length ? `SentinelAI blocked: ${detections.map(d => d.type).join(', ')}` : '',
    };
}
