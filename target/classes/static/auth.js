/**
 * SMART RECIPE PLANNER & MEAL ORGANIZER
 * Authentication & Account Controller (Direct Username & Password - No OTP)
 */

const API_BASE = "/api/auth";

// =============================================================================
// UI FEEDBACK
// =============================================================================

function setAuthMessage(text, type = 'info') {
    const msg = document.getElementById('authMessage');
    if (!msg) return;

    if (!text) {
        msg.innerHTML = "";
        return;
    }

    let icon = '<span class="material-symbols-outlined" aria-hidden="true">info</span>';
    if (type === 'success') {
        msg.style.color = '#0E8345';
        icon = '<span class="material-symbols-outlined" aria-hidden="true">check_circle</span>';
    } else if (type === 'error') {
        msg.style.color = '#D32F2F';
        icon = '<span class="material-symbols-outlined" aria-hidden="true">error</span>';
    } else {
        msg.style.color = 'var(--btn-primary-bg)';
        icon = '<span class="material-symbols-outlined" aria-hidden="true">info</span>';
    }

    msg.innerHTML = `${icon} <span>${escapeHtml(text)}</span>`;
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// =============================================================================
// TAB SWITCHING & PASSWORD TOGGLE
// =============================================================================

function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const regForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.auth-tab-btn');
    const indicator = document.getElementById('tabIndicator');

    setAuthMessage('');

    if (tab === 'login') {
        if (loginForm) loginForm.classList.remove('hidden');
        if (regForm) regForm.classList.add('hidden');
        if (tabs[0]) tabs[0].classList.add('active');
        if (tabs[1]) tabs[1].classList.remove('active');
        if (indicator) indicator.classList.remove('signup-active');
        document.getElementById('loginUsername')?.focus();
    } else if (tab === 'register') {
        if (loginForm) loginForm.classList.add('hidden');
        if (regForm) regForm.classList.remove('hidden');
        if (tabs[0]) tabs[0].classList.remove('active');
        if (tabs[1]) tabs[1].classList.add('active');
        if (indicator) indicator.classList.add('signup-active');
        document.getElementById('regUsername')?.focus();
    }
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const icon = btn.querySelector('.material-symbols-outlined') || btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        btn.setAttribute('aria-label', 'Hide password');
        btn.setAttribute('title', 'Hide password');
        if (icon) icon.textContent = 'visibility_off';
    } else {
        input.type = 'password';
        btn.setAttribute('aria-label', 'Show password');
        btn.setAttribute('title', 'Show password');
        if (icon) icon.textContent = 'visibility';
    }
}

// =============================================================================
// FORM HANDLERS (LOGIN & REGISTER - DIRECT USERNAME + PASSWORD)
// =============================================================================

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        setAuthMessage("Please enter both username and password.", "error");
        return;
    }

    try {
        setAuthMessage("Signing in...", "info");

        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('user', JSON.stringify(data));
            setAuthMessage("Login Successful! Redirecting to meal planner...", "success");

            setTimeout(() => {
                window.location.href = "index.html";
            }, 600);
        } else {
            setAuthMessage(data.message || "Invalid username or password!", "error");
        }
    } catch (err) {
        setAuthMessage("Network or server connection error. Verify Spring Boot is running.", "error");
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!username || !password) {
        setAuthMessage("Please enter both username and password.", "error");
        return;
    }

    if (password.length < 4) {
        setAuthMessage("Password must be at least 4 characters long.", "error");
        return;
    }

    try {
        setAuthMessage("Creating your account...", "info");

        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            setAuthMessage("Account created! Signing you in...", "success");

            // Auto-sign in the user for seamless experience
            try {
                const loginRes = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (loginRes.ok) {
                    const loginData = await loginRes.json();
                    localStorage.setItem('user', JSON.stringify(loginData));
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 600);
                    return;
                }
            } catch (autoLoginErr) {
                // Ignore auto-login error and fallback to switching tab
            }

            // Fallback: switch to sign in tab pre-filling username
            switchTab('login');
            const loginUserInput = document.getElementById('loginUsername');
            if (loginUserInput) loginUserInput.value = username;
            setAuthMessage("Account created successfully! Please sign in.", "success");
        } else {
            setAuthMessage(data.message || "Registration failed.", "error");
        }
    } catch (err) {
        setAuthMessage("Server error. Ensure Spring Boot is active.", "error");
    }
}