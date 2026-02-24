/**
 * SentinelAI Browser Extension — Background Service Worker
 * 
 * Updated to work with Vercel deployment.
 * Change SENTINEL_API to your Vercel deployment URL.
 */

// ⚠️ CHANGE THIS to your Vercel deployment URL after deploying
const SENTINEL_API = 'https://sentinel-ai-xi-rouge.vercel.app/api';

// Extension state
let isEnabled = true;
let stats = { scanned: 0, blocked: 0, warned: 0 };
let sessionToken = null;

chrome.storage.local.get(['isEnabled', 'stats', 'apiUrl', 'sessionToken'], (data) => {
    if (data.isEnabled !== undefined) isEnabled = data.isEnabled;
    if (data.stats) stats = data.stats;
    if (data.sessionToken) sessionToken = data.sessionToken;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCAN_PROMPT') {
        handleScan(message.data, sender.tab).then(sendResponse);
        return true;
    }
    if (message.type === 'GET_STATUS') {
        getAuthToken().then((token) => {
            sendResponse({ isEnabled, stats, sessionToken: token });
        });
        return true; // async
    }
    if (message.type === 'LOGIN') {
        getApiUrl().then(apiUrl => {
            const dashboardUrl = apiUrl.replace('/api', '');
            chrome.tabs.create({ url: `${dashboardUrl}/login` });
            sendResponse({ pending: true });
        });
        return true;
    }
    if (message.type === 'LOGOUT') {
        getApiUrl().then(apiUrl => {
            const urlObj = new URL(apiUrl);
            chrome.cookies.remove({ url: apiUrl.replace('/api', ''), name: 'better-auth.session_token' });
            chrome.cookies.remove({ url: apiUrl.replace('/api', ''), name: '__Secure-better-auth.session_token' });
            sendResponse({ ok: true });
        });
        return true;
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

async function getAuthToken() {
    const apiUrl = await getApiUrl();
    try {
        const urlObj = new URL(apiUrl.replace('/api', ''));
        const domain = urlObj.hostname;

        return new Promise((resolve) => {
            chrome.cookies.getAll({ domain }, (cookies) => {
                // Find either standard or secure session token
                const tokenCookie = cookies.find(c =>
                    c.name === 'better-auth.session_token' ||
                    c.name === '__Secure-better-auth.session_token'
                );

                resolve(tokenCookie ? tokenCookie.value : null);
            });
        });
    } catch (err) {
        console.warn('Failed to parse domain for cookies:', err);
        return null;
    }
}

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
    const token = await getAuthToken();

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            // Better Auth supports Bearer tokens directly
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${apiUrl}/scan`, {
            method: 'POST',
            headers,
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
