/**
 * Form Validation & UI Input Enhancement Module
 * Implements Design Web Infographic Rules & 10 UI Input Tips
 */

const REGEX_PATTERNS = {
  email: /^[\s@]+@[\s@]+\.[\s@]+$/,
  passwordStrong: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/,
  phone: /^(0|\+84)[3|5|7|8|9][0-9]{8}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/
};

const ERROR_MESSAGES = {
  required: 'Vui lòng nhập thông tin này',
  email: 'Email chưa đúng định dạng. Ví dụ: name@example.com',
  passwordWeak: 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
  passwordMatch: 'Mật khẩu xác nhận không trùng khớp',
  phone: 'Số điện thoại không hợp lệ (10 chữ số bắt đầu bằng 0 hoặc +84)',
  username: 'Tên đăng nhập chỉ chứa chữ cái, số, gạch dưới và dài 3-20 ký tự'
};

document.addEventListener('DOMContentLoaded', () => {
  initInputTrimming();
  initPasswordToggles();
  initPasswordStrengthMeters();
  initFormValidations();
});

/**
 * Automatically trim whitespace on blur (Tip 07)
 */
function initInputTrimming() {
  document.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('blur', () => {
      if (typeof input.value === 'string') {
        input.value = input.value.trim();
      }
    });
  });
}

/**
 * Interactive password visibility toggle (Tip 09)
 */
function initPasswordToggles() {
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const wrapper = btn.closest('.password-input-wrapper');
      if (!wrapper) return;
      const input = wrapper.querySelector('input');
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.setAttribute('aria-label', isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      
      // Update eye icon SVG
      btn.innerHTML = isPassword
        ? `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.05 10.05 0 013.98-.863c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-6.102-3.131a3 3 0 11-4.243-4.242M3 3l18 18"/></svg>`
        : `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
    });
  });
}

/**
 * Dynamic Password Strength Meter (Tip 09)
 */
function initPasswordStrengthMeters() {
  document.querySelectorAll('input[type="password"][data-strength-meter]').forEach(input => {
    const meterId = input.getAttribute('data-strength-meter');
    const bar = document.getElementById(meterId);
    if (!bar) return;

    input.addEventListener('input', () => {
      const val = input.value;
      let score = 0;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
      if (/\d/.test(val)) score++;
      if (/[^\w\s]/.test(val)) score++;

      bar.className = 'password-strength-bar';
      if (val.length === 0) {
        bar.style.width = '0%';
      } else if (score <= 2) {
        bar.classList.add('weak');
      } else if (score === 3) {
        bar.classList.add('medium');
      } else {
        bar.classList.add('strong');
      }
    });
  });
}

/**
 * Form Submission Validation Handler (Tip 02, 03, 06, 08)
 */
function initFormValidations() {
  document.querySelectorAll('form[data-validate]').forEach(form => {
    form.addEventListener('submit', (e) => {
      let isValid = true;
      const inputs = form.querySelectorAll('.form-control[required], .form-control[data-rules]');

      inputs.forEach(input => {
        const error = validateInput(input, form);
        if (error) {
          showInputError(input, error);
          isValid = false;
        } else {
          clearInputError(input);
        }
      });

      if (!isValid) {
        e.preventDefault();
        // Focus first invalid input
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
      }
    });

    // Clear error on input
    form.querySelectorAll('.form-control').forEach(input => {
      input.addEventListener('input', () => {
        if (input.classList.contains('is-invalid')) {
          const error = validateInput(input, form);
          if (!error) clearInputError(input);
        }
      });
    });
  });
}

function validateInput(input, form) {
  const val = input.value.trim();
  const rules = (input.getAttribute('data-rules') || '').split('|');
  const type = input.type;

  if (input.hasAttribute('required') && !val) {
    return ERROR_MESSAGES.required;
  }

  if (!val) return null; // Empty optional fields are valid

  if (type === 'email' || rules.includes('email')) {
    if (!REGEX_PATTERNS.email.test(val)) return ERROR_MESSAGES.email;
  }

  if (type === 'tel' || rules.includes('phone')) {
    if (!REGEX_PATTERNS.phone.test(val)) return ERROR_MESSAGES.phone;
  }

  if (rules.includes('username')) {
    if (!REGEX_PATTERNS.username.test(val)) return ERROR_MESSAGES.username;
  }

  if (rules.includes('strong-password')) {
    if (!REGEX_PATTERNS.passwordStrong.test(val)) return ERROR_MESSAGES.passwordWeak;
  }

  if (rules.includes('confirm-password')) {
    const targetId = input.getAttribute('data-confirm-target');
    const targetInput = targetId ? document.getElementById(targetId) : null;
    if (targetInput && targetInput.value !== val) {
      return ERROR_MESSAGES.passwordMatch;
    }
  }

  return null;
}

function showInputError(input, message) {
  input.classList.add('is-invalid');
  const group = input.closest('.form-group') || input.parentElement;
  if (!group) return;

  group.classList.add('has-error');
  let errEl = group.querySelector('.form-error-msg');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'form-error-msg';
    group.appendChild(errEl);
  }
  errEl.innerHTML = `<svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg> <span>${message}</span>`;
}

function clearInputError(input) {
  input.classList.remove('is-invalid');
  const group = input.closest('.form-group') || input.parentElement;
  if (!group) return;

  group.classList.remove('has-error');
  const errEl = group.querySelector('.form-error-msg');
  if (errEl) errEl.remove();
}
