const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let bad = new Set();
files.forEach(f => {
  const text = fs.readFileSync(f, 'utf8');
  // Match any word containing the replacement character (U+FFFD)
  const matches = text.match(/[A-Za-zÀ-ỹ0-9]*\ufffd[A-Za-zÀ-ỹ0-9\ufffd]*/g);
  if (matches) matches.forEach(m => bad.add(m));
});
console.log(Array.from(bad).sort().join('\n'));
