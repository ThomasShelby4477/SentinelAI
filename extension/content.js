/**
 * SentinelAI Content Script — DOM-level prompt interception.
 * 
 * Hooks into ChatGPT, Claude, and Gemini input fields.
 * Intercepts prompts before submission and sends them to the background
 * service worker for scanning.
 */

(() => {
    'use strict';

    const SITE_SELECTORS = {
        'chat.openai.com': { input: '#prompt-textarea', submit: '[data-testid="send-button"]' },
        'chatgpt.com': { input: '#prompt-textarea', submit: '[data-testid="send-button"]' },
        'claude.ai': { input: '[contenteditable="true"]', submit: 'button[aria-label="Send Message"]' },
        'gemini.google.com': { input: '.ql-editor', submit: 'button[aria-label="Send message"]' },
        'copilot.microsoft.com': { input: '#searchbox', submit: '#submit-button' },
    };

    const hostname = window.location.hostname;
    const siteConfig = SITE_SELECTORS[hostname];
    if (!siteConfig) return;

    let isBlocking = false;

    // ── Interception ──────────────────────────────────────────────

    function getPromptText(element) {
        if (!element) return '';
        return element.innerText || element.textContent || element.value || '';
    }

    function interceptSubmit(e) {
        if (isBlocking) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
        }

        const inputEl = document.querySelector(siteConfig.input);
        const promptText = getPromptText(inputEl);

        if (!promptText || promptText.length < 5) return;

        // Block the submission while we scan
        e.preventDefault();
        e.stopImmediatePropagation();

        // This flag ensures our synthetic click below doesn't get re-scanned
        isBlocking = true;

        chrome.runtime.sendMessage(
            { type: 'SCAN_PROMPT', data: { prompt: promptText, app: hostname } },
            (result) => {
                if (!result || result.action === 'ALLOW') {
                    // Re-submit by clicking the button, keeping isBlocking=true so it bypasses our listener,
                    // but passes through to the site's React handler.
                    const submitBtn = document.querySelector(siteConfig.submit);
                    if (submitBtn) submitBtn.click();
                    setTimeout(() => { isBlocking = false; }, 500);
                } else if (result.action === 'WARN') {
                    showWarning(result, () => {
                        const submitBtn = document.querySelector(siteConfig.submit);
                        if (submitBtn) submitBtn.click();
                        setTimeout(() => { isBlocking = false; }, 500);
                    });
                } else if (result.action === 'BLOCK') {
                    showBlockNotification(result);
                    isBlocking = false;
                }
            }
        );
    }

    // ── UI Notifications ──────────────────────────────────────────

    function showBlockNotification(result) {
        const notification = createNotification(
            'BLOCKED',
            result.message || 'Sensitive data detected. This prompt has been blocked.',
            result.detections || [],
            'block'
        );
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('sentinel-visible'), 10);
        setTimeout(() => removeNotification(notification), 8000);
    }

    function showWarning(result, onProceed) {
        const notification = createNotification(
            'WARNING',
            result.message || 'Potentially sensitive data detected.',
            result.detections || [],
            'warn'
        );

        const actions = document.createElement('div');
        actions.className = 'sentinel-actions';

        const proceedBtn = document.createElement('button');
        proceedBtn.textContent = 'Proceed Anyway';
        proceedBtn.className = 'sentinel-btn sentinel-btn-warn';
        proceedBtn.onclick = () => { removeNotification(notification); onProceed(); };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'sentinel-btn sentinel-btn-cancel';
        cancelBtn.onclick = () => removeNotification(notification);

        actions.appendChild(cancelBtn);
        actions.appendChild(proceedBtn);
        notification.appendChild(actions);

        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('sentinel-visible'), 10);
    }

    function createNotification(title, message, detections, type) {
        const el = document.createElement('div');
        el.className = `sentinel-notification sentinel-${type}`;
        el.innerHTML = `
            <div class="sentinel-header">
                <div class="sentinel-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <strong>SentinelAI</strong>
                </div>
                <span class="sentinel-badge sentinel-badge-${type}">${title}</span>
                <button class="sentinel-close" onclick="this.closest('.sentinel-notification').remove()">×</button>
            </div>
            <p class="sentinel-message">${message}</p>
            ${detections.length ? `
                <div class="sentinel-detections">
                    ${detections.slice(0, 5).map(d => `
                        <div class="sentinel-detection-item">
                            <span class="sentinel-det-type">${d.type}</span>
                            <code class="sentinel-det-span">${(d.span || '').substring(0, 40)}${(d.span || '').length > 40 ? '...' : ''}</code>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
        return el;
    }

    function removeNotification(el) {
        el.classList.remove('sentinel-visible');
        setTimeout(() => el.remove(), 300);
    }

    // ── Setup Observer ────────────────────────────────────────────

    function attachListeners() {
        // Intercept submit button clicks via event delegation (handles dynamic React/Vue elements)
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest(siteConfig.submit);
            if (target) {
                // If it's the submit button, run interception
                interceptSubmit(e);
            }
        }, true); // Use capture phase for highest priority

        // Intercept Enter key on input
        const inputEl = document.querySelector(siteConfig.input);
        if (inputEl) {
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    interceptSubmit(e);
                }
            }, true);
        }
    }

    // Wait for elements to appear (SPAs load dynamically)
    const observer = new MutationObserver(() => {
        const input = document.querySelector(siteConfig.input);
        const submit = document.querySelector(siteConfig.submit);
        if (input && submit) {
            attachListeners();
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial attempt
    setTimeout(attachListeners, 2000);
})();
