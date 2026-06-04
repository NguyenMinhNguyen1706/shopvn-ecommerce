const fs = require('fs');

const content = fs.readFileSync('register.html', 'utf8');

// Try converting it using different encodings
// Often mojibake is: read as windows-1252 instead of utf-8
// But JS 'binary' is actually latin1 (ISO-8859-1). Sometimes cp1252 differs slightly.
// To use windows-1252, we can use iconv-lite if installed, or just native Buffer.

try {
  let bytes = [];
  for(let i=0; i<content.length; i++) {
    const code = content.charCodeAt(i);
    // If the character is beyond 255, it might have been mapped to something else, or it's a specific cp1252 char
    // Actually, in PowerShell, reading UTF-8 without -Encoding reads it using the system default codepage (usually cp1252).
    if (code > 255) {
       // PowerShell cp1252 maps some bytes (like 0x81, 0x8D, 0x8F, 0x90, 0x9D) to specific unicode chars in cp1252
       // But let's just see what charCodeAt gives
    }
  }
} catch(e) {}

// A simple way is to use iconv-lite if available, let's check.
const iconv = require('iconv-lite');
const fixed = iconv.decode(iconv.encode(content, 'cp1252'), 'utf8');
fs.writeFileSync('register_fixed.html', fixed);
console.log("Done");
