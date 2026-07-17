class I18n {
  constructor() {
    this.lang = localStorage.getItem('lang') || 'vi';
    this.locales = window.locales || {};
  }

  setLang(lang) {
    if (this.locales[lang]) {
      this.lang = lang;
      localStorage.setItem('lang', lang);
      this.translatePage();
      this.updateSwitcher();
    }
  }

  getLang() {
    return this.lang;
  }

  switcherMarkup() {
    const label = this.lang === 'vi' ? 'VI' : 'EN';
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"></path>
      </svg>
      <span>${label}</span>
    `;
  }

  updateSwitcher() {
    document.querySelectorAll('.lang-btn').forEach(button => {
      button.innerHTML = this.switcherMarkup();
      button.setAttribute(
        'aria-label',
        this.lang === 'vi' ? 'VI - Switch to English' : 'EN - Chuyển sang tiếng Việt'
      );
    });
  }

  t(key) {
    return this.locales[this.lang] && this.locales[this.lang][key] ? this.locales[this.lang][key] : key;
  }

  translatePage() {
    // Translate text content
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (this.locales[this.lang][key]) {
        el.textContent = this.locales[this.lang][key];
      }
    });

    // Translate placeholders
    const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (this.locales[this.lang][key]) {
        el.placeholder = this.locales[this.lang][key];
      }
    });

    // Translate Document Title
    if (this.lang === 'vi') {
      if (document.title.includes('Smart Shopping')) {
        document.title = document.title.replace('Smart Shopping', 'Mua sắm thông minh');
      }
    } else {
      if (document.title.includes('Mua sắm thông minh')) {
        document.title = document.title.replace('Mua sắm thông minh', 'Smart Shopping');
      }
    }
  }

  init() {
    // Inject Language Switcher into Navbar if it exists
    const navbarActions = document.querySelector('.navbar__actions');
    if (navbarActions && !document.getElementById('lang-switcher')) {
      const switcherHtml = `
        <div id="lang-switcher" class="lang-switcher">
          <button type="button" class="lang-btn" onclick="i18n.setLang(i18n.getLang() === 'vi' ? 'en' : 'vi')">
            ${this.switcherMarkup()}
          </button>
        </div>
      `;
      // Insert before cart buttons
      navbarActions.insertAdjacentHTML('afterbegin', switcherHtml);
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.translatePage();
        this.updateSwitcher();
      });
    } else {
      this.translatePage();
      this.updateSwitcher();
    }
  }
}

window.i18n = new I18n();
window.i18n.init();
