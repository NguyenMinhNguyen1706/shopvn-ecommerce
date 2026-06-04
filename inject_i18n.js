const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
files.forEach(f => {
  let html = fs.readFileSync(f, 'utf8');
  if (!html.includes('locales/vi.js')) {
    html = html.replace('</body>', '<script src="js/locales/vi.js"></script>\n<script src="js/locales/en.js"></script>\n<script src="js/i18n.js"></script>\n</body>');
    fs.writeFileSync(f, html);
    console.log('Injected in', f);
  }
});
