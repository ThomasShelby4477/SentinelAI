const authSection = document.getElementById('authSection');
const mainSection = document.getElementById('mainSection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

const toggle = document.getElementById('toggle');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (resp) => {
    if (resp) {
        if (!resp.sessionToken) {
            authSection.style.display = 'flex';
            mainSection.style.display = 'none';
        } else {
            authSection.style.display = 'none';
            mainSection.style.display = 'block';
        }

        toggle.classList.toggle('active', resp.isEnabled);
        statusDot.classList.toggle('off', !resp.isEnabled);
        statusText.textContent = resp.isEnabled ? 'Protection active' : 'Protection disabled';
        document.getElementById('scanned').textContent = resp.stats?.scanned || 0;
        document.getElementById('blocked').textContent = resp.stats?.blocked || 0;
        document.getElementById('warned').textContent = resp.stats?.warned || 0;
    }
});

loginBtn.addEventListener('click', () => {
    loginBtn.textContent = 'Opening Dashboard...';
    chrome.runtime.sendMessage({ type: 'LOGIN' }, (resp) => {
        if (resp && resp.pending) {
            setTimeout(() => window.close(), 800);
        } else {
            loginBtn.textContent = 'Sign in failed. Try again.';
            setTimeout(() => {
                loginBtn.innerHTML = 'Sign in with Google';
            }, 3000);
        }
    });
});

logoutBtn.addEventListener('click', () => {
    logoutBtn.textContent = 'Signing out...';
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
        window.location.reload();
    });
});

// Load saved API URL
chrome.storage.local.get(['apiUrl'], (data) => {
    if (data.apiUrl) {
        document.getElementById('apiUrl').value = data.apiUrl;
        document.getElementById('dashLink').href = data.apiUrl.replace('/api', '');
    }
});

document.getElementById('saveUrl').addEventListener('click', () => {
    const url = document.getElementById('apiUrl').value.trim();
    if (url) {
        chrome.runtime.sendMessage({ type: 'SET_API_URL', url });
        document.getElementById('dashLink').href = url.replace('/api', '');
        document.getElementById('saveUrl').textContent = '✓ Saved!';
        setTimeout(() => document.getElementById('saveUrl').textContent = 'Save', 1500);
    }
});

toggle.addEventListener('click', () => {
    const newState = !toggle.classList.contains('active');
    toggle.classList.toggle('active', newState);
    statusDot.classList.toggle('off', !newState);
    statusText.textContent = newState ? 'Protection active' : 'Protection disabled';
    chrome.runtime.sendMessage({ type: 'TOGGLE_ENABLED', enabled: newState });
});
