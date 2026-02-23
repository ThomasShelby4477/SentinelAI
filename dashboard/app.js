/**
 * SentinelAI Dashboard — Interactive Application Logic
 * Handles navigation, charts, live scanner, and demo data rendering.
 */

const API_BASE = 'http://localhost:8000/api/v1';

// ── Navigation ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCharts();
    renderDashboard();
    renderPolicies();
    renderAuditLog();
    renderAnalytics();
    initScanner();
});

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
            sidebar.classList.remove('open');
        });
    });

    // View All links
    document.querySelectorAll('.view-all').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(link.dataset.page);
        });
    });

    menuToggle?.addEventListener('click', () => sidebar.classList.toggle('open'));
}

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`page-${pageId}`)?.classList.add('active');
    document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');

    const titles = { dashboard: 'Dashboard', scan: 'Live Scanner', policies: 'Policies', audit: 'Audit Log', analytics: 'Analytics' };
    document.getElementById('pageTitle').textContent = titles[pageId] || 'Dashboard';
}

// ── Demo Data ──────────────────────────────────────────────────

const DEMO_VIOLATIONS = [
    { time: '2 min ago', user: 'priya.sharma@corp.com', source: 'browser_extension', detection: 'Aadhaar Number', severity: 'critical', action: 'BLOCK', score: 0.95 },
    { time: '8 min ago', user: 'raj.patel@corp.com', source: 'api_gateway', detection: 'OpenAI API Key', severity: 'critical', action: 'BLOCK', score: 0.98 },
    { time: '15 min ago', user: 'emily.chen@corp.com', source: 'proxy', detection: 'PostgreSQL Connection', severity: 'critical', action: 'BLOCK', score: 0.92 },
    { time: '23 min ago', user: 'alex.kumar@corp.com', source: 'browser_extension', detection: 'Source Code (Python)', severity: 'high', action: 'WARN', score: 0.62 },
    { time: '31 min ago', user: 'sarah.jones@corp.com', source: 'endpoint_agent', detection: 'JWT Token', severity: 'high', action: 'BLOCK', score: 0.88 },
    { time: '45 min ago', user: 'dev.ops@corp.com', source: 'api_gateway', detection: 'AWS Access Key', severity: 'critical', action: 'BLOCK', score: 0.97 },
    { time: '1 hr ago', user: 'neha.gupta@corp.com', source: 'browser_extension', detection: 'Email + Phone PII', severity: 'medium', action: 'WARN', score: 0.45 },
    { time: '1.5 hr ago', user: 'mike.wilson@corp.com', source: 'proxy', detection: 'Internal URL', severity: 'medium', action: 'WARN', score: 0.52 },
];

const DEMO_POLICIES = [
    { id: 1, name: 'PII Protection', desc: 'Blocks Aadhaar, PAN, SSN, email, and phone numbers from being sent to any LLM endpoint.', action: 'BLOCK', active: true, detectors: ['aadhaar', 'pan', 'ssn', 'email', 'phone'], priority: 10 },
    { id: 2, name: 'API Key & Secret Guard', desc: 'Prevents API keys, tokens, and credentials from leaking to external AI services.', action: 'BLOCK', active: true, detectors: ['openai_key', 'aws_key', 'github_token', 'jwt', 'private_key'], priority: 5 },
    { id: 3, name: 'Database Connection Strings', desc: 'Blocks PostgreSQL, MySQL, MongoDB, and Redis connection strings.', action: 'BLOCK', active: true, detectors: ['postgres_conn', 'mysql_conn', 'mongodb_conn', 'redis_conn'], priority: 15 },
    { id: 4, name: 'Source Code Leakage', desc: 'Warns when source code snippets in Python, JS, Java, or SQL are detected in prompts.', action: 'WARN', active: true, detectors: ['code_python', 'code_javascript', 'code_java', 'code_sql'], priority: 50 },
    { id: 5, name: 'Internal Infrastructure', desc: 'Blocks internal/corporate URLs and private IP addresses from being shared.', action: 'BLOCK', active: true, detectors: ['internal_url', 'private_ip'], priority: 20 },
    { id: 6, name: 'Financial Data', desc: 'Warns on credit card numbers, IBAN, and financial figures detected in prompts.', action: 'WARN', active: false, detectors: ['credit_card', 'iban', 'financial'], priority: 60 },
];

// ── Dashboard Rendering ────────────────────────────────────────

function renderDashboard() {
    document.getElementById('totalScans').textContent = '24,847';
    document.getElementById('totalBlocked').textContent = '1,293';
    document.getElementById('totalWarned').textContent = '847';
    document.getElementById('blockRate').textContent = '5.2%';

    const tbody = document.getElementById('recentViolations');
    tbody.innerHTML = DEMO_VIOLATIONS.map(v => `
        <tr>
            <td>${v.time}</td>
            <td>${v.user}</td>
            <td><span class="badge badge-info">${v.source.replace('_', ' ')}</span></td>
            <td>${v.detection}</td>
            <td><span class="badge badge-${v.severity}">${v.severity}</span></td>
            <td><span class="badge badge-${v.action.toLowerCase()}">${v.action}</span></td>
            <td><strong>${v.score.toFixed(2)}</strong></td>
        </tr>
    `).join('');
}

// ── Charts ─────────────────────────────────────────────────────

function initCharts() {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(42, 49, 81, 0.5)';
    Chart.defaults.font.family = 'Inter';

    // Detection Types Chart
    new Chart(document.getElementById('detectionChart'), {
        type: 'doughnut',
        data: {
            labels: ['PII', 'API Keys', 'Tokens', 'DB Connections', 'Source Code', 'Internal URLs', 'Financial'],
            datasets: [{
                data: [342, 287, 156, 98, 203, 67, 45],
                backgroundColor: [
                    '#6366f1', '#ef4444', '#f59e0b', '#06b6d4', '#22c55e', '#a855f7', '#ec4899'
                ],
                borderWidth: 0,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 } }
            },
            cutout: '65%',
        }
    });

    // Severity Chart
    new Chart(document.getElementById('severityChart'), {
        type: 'bar',
        data: {
            labels: ['Critical', 'High', 'Medium', 'Low'],
            datasets: [{
                label: 'Detections',
                data: [487, 396, 234, 81],
                backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#3b82f6'],
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(42,49,81,0.3)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // Timeline Chart (Analytics)
    const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i));
        return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    });
    const scanData = days.map(() => Math.floor(Math.random() * 400 + 600));
    const blockData = days.map(() => Math.floor(Math.random() * 60 + 20));

    new Chart(document.getElementById('timelineChart'), {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Total Scans',
                    data: scanData,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2,
                },
                {
                    label: 'Blocked',
                    data: blockData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: { legend: { position: 'top', labels: { usePointStyle: true } } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(42,49,81,0.3)' } },
                x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }
            }
        }
    });

    // Source Distribution Chart
    new Chart(document.getElementById('sourceChart'), {
        type: 'polarArea',
        data: {
            labels: ['Browser Extension', 'API Gateway', 'Reverse Proxy', 'Endpoint Agent'],
            datasets: [{
                data: [8420, 6102, 7230, 3095],
                backgroundColor: ['rgba(99,102,241,0.6)', 'rgba(34,197,94,0.6)', 'rgba(245,158,11,0.6)', 'rgba(168,85,247,0.6)'],
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { padding: 12, usePointStyle: true } } },
            scales: { r: { grid: { color: 'rgba(42,49,81,0.3)' }, ticks: { display: false } } }
        }
    });
}

// ── Policies ───────────────────────────────────────────────────

function renderPolicies() {
    const grid = document.getElementById('policiesGrid');
    grid.innerHTML = DEMO_POLICIES.map(p => `
        <div class="policy-card">
            <div class="policy-header">
                <span class="policy-name">${p.name}</span>
                <span class="badge badge-${p.action.toLowerCase()}">${p.action}</span>
            </div>
            <p class="policy-desc">${p.desc}</p>
            <div class="policy-tags">
                ${p.detectors.map(d => `<span class="policy-tag">${d}</span>`).join('')}
            </div>
            <div class="policy-footer">
                <span style="font-size:0.75rem; color:var(--text-muted);">Priority: ${p.priority}</span>
                <div class="toggle-switch ${p.active ? 'active' : ''}" onclick="this.classList.toggle('active')"></div>
            </div>
        </div>
    `).join('');
}

// ── Audit Log ──────────────────────────────────────────────────

function renderAuditLog() {
    const tbody = document.getElementById('auditTableBody');
    const events = [...DEMO_VIOLATIONS, ...DEMO_VIOLATIONS.map(v => ({
        ...v,
        time: (parseInt(v.time) + 2) + v.time.replace(/\d+/, ''),
        score: Math.max(0.1, v.score - Math.random() * 0.2)
    }))];

    tbody.innerHTML = events.map(v => `
        <tr>
            <td>${v.time}</td>
            <td>${v.user}</td>
            <td><span class="badge badge-info">${v.source.replace('_', ' ')}</span></td>
            <td>${v.detection || 'api.openai.com'}</td>
            <td><span class="badge badge-${v.action.toLowerCase()}">${v.action}</span></td>
            <td><strong>${v.score.toFixed(3)}</strong></td>
            <td>${v.detection}</td>
            <td>${Math.floor(Math.random() * 30 + 5)}ms</td>
        </tr>
    `).join('');

    // Filters
    document.getElementById('auditActionFilter')?.addEventListener('change', filterAudit);
    document.getElementById('auditSourceFilter')?.addEventListener('change', filterAudit);
}

function filterAudit() {
    const action = document.getElementById('auditActionFilter').value;
    const source = document.getElementById('auditSourceFilter').value;
    const rows = document.querySelectorAll('#auditTableBody tr');
    rows.forEach(row => {
        const cells = row.cells;
        const matchAction = !action || cells[4].textContent.trim() === action;
        const matchSource = !source || cells[2].textContent.trim().replace(' ', '_') === source;
        row.style.display = (matchAction && matchSource) ? '' : 'none';
    });
}

// ── Analytics ──────────────────────────────────────────────────

function renderAnalytics() {
    const list = document.getElementById('violatorsList');
    const violators = [
        { email: 'dev.ops@corp.com', count: 34 },
        { email: 'raj.patel@corp.com', count: 28 },
        { email: 'priya.sharma@corp.com', count: 22 },
        { email: 'alex.kumar@corp.com', count: 18 },
        { email: 'emily.chen@corp.com', count: 14 },
    ];

    list.innerHTML = violators.map((v, i) => `
        <div class="violator-item">
            <div class="violator-info">
                <span class="violator-rank">${i + 1}</span>
                <span>${v.email}</span>
            </div>
            <span class="violator-count">${v.count} violations</span>
        </div>
    `).join('');
}

// ── Live Scanner ───────────────────────────────────────────────

function initScanner() {
    document.getElementById('scanBtn')?.addEventListener('click', runScan);
}

async function runScan() {
    const prompt = document.getElementById('scanPrompt').value.trim();
    if (!prompt) return;

    const source = document.getElementById('scanSource').value;
    const destination = document.getElementById('scanDestination').value;
    const btn = document.getElementById('scanBtn');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Scanning...';

    try {
        const response = await fetch(`${API_BASE}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source,
                destination,
                prompt,
                user_id: null,
                metadata: { app: 'dashboard-scanner' }
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        displayScanResults(data);
    } catch (err) {
        // Fallback: run client-side detection demo
        const mockResult = runClientSideDetection(prompt, source);
        displayScanResults(mockResult);
    }

    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Scan Prompt';
}

function runClientSideDetection(prompt, source) {
    const detections = [];
    const patterns = [
        { name: 'Aadhaar Number', regex: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g, severity: 'critical', category: 'PII' },
        { name: 'PAN Number', regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g, severity: 'high', category: 'PII' },
        { name: 'SSN', regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g, severity: 'critical', category: 'PII' },
        { name: 'Email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, severity: 'medium', category: 'PII' },
        { name: 'OpenAI API Key', regex: /\bsk-[a-zA-Z0-9]{20,}\b/g, severity: 'critical', category: 'API_KEY' },
        { name: 'AWS Key', regex: /\bAKIA[0-9A-Z]{16}\b/g, severity: 'critical', category: 'API_KEY' },
        { name: 'GitHub Token', regex: /\bghp_[a-zA-Z0-9]{36,}\b/g, severity: 'critical', category: 'API_KEY' },
        { name: 'JWT Token', regex: /\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\b/g, severity: 'high', category: 'TOKEN' },
        { name: 'PostgreSQL Connection', regex: /postgres(?:ql)?:\/\/[^\s'"]{10,}/gi, severity: 'critical', category: 'DB_CONNECTION' },
        { name: 'MongoDB Connection', regex: /mongodb(\+srv)?:\/\/[^\s'"]{10,}/gi, severity: 'critical', category: 'DB_CONNECTION' },
        { name: 'Private IP', regex: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g, severity: 'medium', category: 'INTERNAL_URL' },
        { name: 'Private Key', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, severity: 'critical', category: 'CREDENTIAL' },
        { name: 'Password Assignment', regex: /(?:password|passwd|pwd|secret)[\s]*[:=]\s*['"]?([^\s'"]{8,})['"]?/gi, severity: 'critical', category: 'CREDENTIAL' },
        { name: 'Credit Card', regex: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6011)[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{3,4}\b/g, severity: 'critical', category: 'FINANCIAL' },
    ];

    patterns.forEach(p => {
        const matches = prompt.matchAll(p.regex);
        for (const match of matches) {
            detections.push({
                type: p.name,
                category: p.category,
                severity: p.severity,
                detector: 'regex',
                span: match[0].substring(0, 80),
                confidence: p.severity === 'critical' ? 0.95 : p.severity === 'high' ? 0.80 : 0.60,
            });
        }
    });

    // Code detection heuristic
    const codeKeywords = ['def ', 'class ', 'import ', 'function ', 'const ', 'var ', 'let ', 'return ', 'SELECT ', 'INSERT ', 'CREATE TABLE'];
    const codeHits = codeKeywords.filter(kw => prompt.includes(kw)).length;
    if (codeHits >= 3) {
        detections.push({
            type: 'Source Code', category: 'SOURCE_CODE', severity: 'high',
            detector: 'code_classifier', span: prompt.substring(0, 80), confidence: 0.75,
        });
    }

    const maxConf = detections.length ? Math.max(...detections.map(d => d.confidence)) : 0;
    const riskScore = Math.min(maxConf * (1 + detections.length * 0.05), 1.0);
    const action = riskScore >= 0.7 ? 'BLOCK' : riskScore >= 0.3 ? 'WARN' : 'ALLOW';

    return {
        request_id: crypto.randomUUID(),
        action,
        risk_score: parseFloat(riskScore.toFixed(4)),
        detections,
        latency_ms: Math.floor(Math.random() * 20 + 3),
        message: action === 'BLOCK'
            ? `Blocked: detected ${[...new Set(detections.map(d => d.type))].slice(0, 3).join(', ')}.`
            : action === 'WARN'
            ? 'Warning: potentially sensitive data detected.'
            : 'No sensitive data detected.',
    };
}

function displayScanResults(data) {
    const container = document.getElementById('scanResults');
    const actionBadge = document.getElementById('resultAction');
    const body = document.getElementById('resultBody');

    container.style.display = 'block';

    actionBadge.className = `badge badge-${data.action.toLowerCase()}`;
    actionBadge.textContent = data.action;

    const scoreColor = data.risk_score >= 0.7 ? 'var(--red)' : data.risk_score >= 0.3 ? 'var(--amber)' : 'var(--green)';

    body.innerHTML = `
        <div class="result-meta">
            <div class="meta-item">
                <span class="meta-label">Risk Score</span>
                <span class="meta-value" style="color:${scoreColor}">${data.risk_score.toFixed(4)}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Detections</span>
                <span class="meta-value">${data.detections.length}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Latency</span>
                <span class="meta-value">${data.latency_ms}ms</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Action</span>
                <span class="meta-value">${data.action}</span>
            </div>
        </div>
        <div class="risk-score-bar">
            <div class="risk-score-fill" style="width:${data.risk_score * 100}%; background:${scoreColor};"></div>
        </div>
        ${data.message ? `<p style="margin-bottom:16px; color:${scoreColor}; font-weight:600;">${data.message}</p>` : ''}
        ${data.detections.length === 0 ? '<p style="color:var(--green); text-align:center; padding:20px;">✅ No sensitive data detected. Prompt is clean.</p>' : ''}
        ${data.detections.map(d => `
            <div class="result-item ${d.severity === 'medium' ? 'warn' : d.severity === 'low' ? 'info' : ''}">
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <strong>${d.type}</strong>
                        <span class="badge badge-${d.severity}">${d.severity}</span>
                        <span style="color:var(--text-muted); font-size:0.75rem;">${d.detector}</span>
                    </div>
                    <code style="font-size:0.8rem; color:var(--amber); word-break:break-all;">${escapeHtml(d.span)}</code>
                    <div style="margin-top:6px; font-size:0.75rem; color:var(--text-muted);">
                        Confidence: ${(d.confidence * 100).toFixed(1)}% · Category: ${d.category}
                    </div>
                </div>
            </div>
        `).join('')}
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
