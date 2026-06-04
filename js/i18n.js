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
    }
  }

  getLang() {
    return this.lang;
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
          <button class="lang-btn" onclick="i18n.setLang(i18n.getLang() === 'vi' ? 'en' : 'vi')">
            ${this.lang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}
          </button>
        </div>
      `;
      // Insert before cart buttons
      navbarActions.insertAdjacentHTML('afterbegin', switcherHtml);
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.translatePage());
    } else {
      this.translatePage();
    }
  }
}

window.i18n = new I18n();
window.i18n.init();
