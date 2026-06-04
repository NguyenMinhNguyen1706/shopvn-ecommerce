/**
 * auth-page.js — Logic cho login.html và register.html
 *
 * Chứa: validate input, password strength, submit handler,
 * toggle password visibility, remember me, redirect sau login.
 */

// ── Validation rules ──────────────────────────────────────────────────────────

const Validators = {
  required: (v) => v.trim().length > 0 || 'Vui lòng không để trống.',
  minLen:   (n) => (v) => v.length >= n  || `Tối thiểu ${n} ký tự.`,
  maxLen:   (n) => (v) => v.length <= n  || `Tối đa ${n} ký tự.`,
  email:    (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email không hợp lệ.',
  phone:    (v) => /^(0|\+84)[3-9]\d{8}$/.test(v.replace(/\s/g,'')) || 'Số điện thoại không hợp lệ.',
  match:    (otherId) => (v) => v === document.getElementById(otherId)?.value || 'Mật khẩu không khớp.',
  noSpace:  (v) => !/\s/.test(v) || 'Không được chứa khoảng trắng.',
};

/**
 * Validate một field và hiện/ẩn lỗi
 * @param {string} fieldId
 * @param {Array}  rules  — mảng validator functions
 * @returns {boolean}
 */
function validateField(fieldId, rules) {
  const input  = document.getElementById(fieldId);
  const errEl  = document.getElementById(fieldId + '-err');
  if (!input) return true;

  let errorMsg = null;
  for (const rule of rules) {
    const result = rule(input.value);
    if (result !== true) { errorMsg = result; break; }
  }

  if (errorMsg) {
    input.classList.add('error');
    input.classList.remove('success');
    if (errEl) { errEl.textContent = errorMsg; errEl.classList.add('show'); }
    return false;
  } else {
    input.classList.remove('error');
    input.classList.add('success');
    if (errEl) errEl.classList.remove('show');
    return true;
  }
}

/** Clear trạng thái validate của một field */
function clearFieldState(fieldId) {
  const input = document.getElementById(fieldId);
  const errEl = document.getElementById(fieldId + '-err');
  input?.classList.remove('error', 'success');
  errEl?.classList.remove('show');
}

// ── Password toggle ───────────────────────────────────────────────────────────

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.innerHTML = isHidden ? eyeOffIcon() : eyeIcon();
}

function eyeIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`;
}
function eyeOffIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
             a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4
             c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07
             a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`;
}

// ── Password strength ─────────────────────────────────────────────────────────

function calcPasswordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8)              score++;
  if (/[A-Z]/.test(pwd))            score++;
  if (/[0-9]/.test(pwd))            score++;
  if (/[^A-Za-z0-9]/.test(pwd))     score++;
  return score; // 0-4
}

function updatePasswordStrength(pwd) {
  const wrap = document.getElementById('pwd-strength');
  if (!wrap) return;

  const score = calcPasswordStrength(pwd);
  const segs  = wrap.querySelectorAll('.pwd-strength__seg');
  const label = wrap.querySelector('.pwd-strength__label');

  const levels = ['', 'weak', 'weak', 'medium', 'strong'];
  const texts  = ['', 'Yếu', 'Yếu', 'Trung bình', 'Mạnh'];
  const colors = ['', '#e53935', '#e53935', '#fb8c00', '#43a047'];

  segs.forEach((seg, i) => {
    seg.className = 'pwd-strength__seg';
    if (i < score) seg.classList.add(levels[score]);
  });

  if (label) {
    label.textContent = pwd.length > 0 ? `Độ mạnh: ${texts[score]}` : '';
    label.style.color = colors[score];
  }
}

// ── Button loading state ──────────────────────────────────────────────────────

function setButtonLoading(btn, loading) {
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}

// ── LOGIN handler ─────────────────────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();

  const emailOk = validateField('email', [Validators.required, Validators.email]);
  const pwdOk   = validateField('password', [Validators.required, Validators.minLen(6)]);
  if (!emailOk || !pwdOk) return;

  const btn = document.getElementById('submit-btn');
  setButtonLoading(btn, true);

  try {
    const data = await AuthAPI.login({
      email:    document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
    });
    Auth.saveSession(data);

    // Remember me
    if (document.getElementById('remember')?.checked) {
      localStorage.setItem('rememberedEmail', data.user.email);
    }

    showToast('Đăng nhập thành công! Đang chuyển trang...', 'success');
    setTimeout(() => window.location.href = 'index.html', 900);

  } catch (err) {
    showToast(err.message || 'Email hoặc mật khẩu không đúng.', 'error');
    document.getElementById('email')?.classList.add('error');
    document.getElementById('password')?.classList.add('error');
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── REGISTER handler ──────────────────────────────────────────────────────────

async function handleRegister(e) {
  e.preventDefault();

  const nameOk    = validateField('fullname', [Validators.required, Validators.minLen(2)]);
  const emailOk   = validateField('email',    [Validators.required, Validators.email]);
  const phoneOk   = validateField('phone',    [Validators.required, Validators.phone]);
  const pwdOk     = validateField('password', [
    Validators.required, Validators.minLen(8), Validators.noSpace,
  ]);
  const confirmOk = validateField('confirm-password', [
    Validators.required, Validators.match('password'),
  ]);
  const terms     = document.getElementById('terms');
  if (terms && !terms.checked) {
    showToast('Vui lòng đồng ý với điều khoản sử dụng.', 'warning');
    return;
  }
  if (!nameOk || !emailOk || !phoneOk || !pwdOk || !confirmOk) return;

  const btn = document.getElementById('submit-btn');
  setButtonLoading(btn, true);

  try {
    const data = await AuthAPI.register({
      name:     document.getElementById('fullname').value.trim(),
      email:    document.getElementById('email').value.trim(),
      phone:    document.getElementById('phone').value.trim(),
      password: document.getElementById('password').value,
    });
    Auth.saveSession(data);

    showToast('Đăng ký thành công! Chào mừng bạn đến với ShopVN 🎉', 'success');
    setTimeout(() => window.location.href = 'index.html', 1000);

  } catch (err) {
    showToast(err.message || 'Đăng ký thất bại, vui lòng thử lại.', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

// ── SOCIAL LOGIN handler ──────────────────────────────────────────────────────

function handleGoogleLogin() {
  if (typeof google === 'undefined' || !google.accounts) {
    return showToast('Google SDK đang tải, vui lòng chờ...', 'info');
  }
  const client = google.accounts.oauth2.initTokenClient({
    client_id: '366101913636-tudfqfeegifh0gftgv4oeok1v340kcqo.apps.googleusercontent.com',
    scope: 'email profile',
    callback: async (response) => {
      if (response && response.access_token) {
        processSocialLogin('google', response.access_token);
      }
    },
  });
  client.requestAccessToken();
}

function handleFacebookLogin() {
  if (typeof FB === 'undefined') {
    return showToast('Facebook SDK đang tải, vui lòng chờ...', 'info');
  }
  
  // FB.init chỉ nên gọi 1 lần, nếu đã gọi rồi thì bỏ qua
  if (!window.fbInitialized) {
    FB.init({
      appId      : 'YOUR_FACEBOOK_APP_ID',
      cookie     : true,
      xfbml      : true,
      version    : 'v18.0'
    });
    window.fbInitialized = true;
  }
  
  FB.login(function(response) {
    if (response.authResponse) {
      processSocialLogin('facebook', response.authResponse.accessToken);
    } else {
      showToast('Bạn đã hủy đăng nhập Facebook.', 'info');
    }
  }, {scope: 'public_profile,email'});
}

async function processSocialLogin(provider, token) {
  try {
    const btn = document.getElementById('submit-btn');
    if (btn) setButtonLoading(btn, true);
    
    const data = await AuthAPI.socialLogin({ provider, token });
    Auth.saveSession(data);
    
    showToast(`Đăng nhập bằng ${provider} thành công!`, 'success');
    setTimeout(() => window.location.href = 'index.html', 900);
  } catch (err) {
    showToast(err.message || `Đăng nhập ${provider} thất bại.`, 'error');
  } finally {
    const btn = document.getElementById('submit-btn');
    if (btn) setButtonLoading(btn, false);
  }
}

window.handleGoogleLogin = handleGoogleLogin;
window.handleFacebookLogin = handleFacebookLogin;

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Redirect nếu đã đăng nhập
  if (Auth.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  // Pre-fill remembered email
  const remembered = localStorage.getItem('rememberedEmail');
  const emailInput = document.getElementById('email');
  if (remembered && emailInput) {
    emailInput.value = remembered;
    const rememberCb = document.getElementById('remember');
    if (rememberCb) rememberCb.checked = true;
  }

  // Real-time validation on blur
  document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('blur', () => {
      if (input.value.length > 0) {
        // Trigger validate dựa trên data-rules attribute
        const rules = input.dataset.validate?.split(',') || [];
        if (rules.includes('email'))   validateField(input.id, [Validators.email]);
        if (rules.includes('min8'))    validateField(input.id, [Validators.minLen(8)]);
        if (rules.includes('phone'))   validateField(input.id, [Validators.phone]);
        if (rules.includes('match'))   validateField(input.id, [Validators.match('password')]);
      }
    });
    // Clear error on type
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) clearFieldState(input.id);
      // Password strength
      if (input.id === 'password') updatePasswordStrength(input.value);
    });
  });

  // Form submit
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);
});
