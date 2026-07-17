const { buildSafePublicId } = require('../../src/services/upload.service');

describe('upload service', () => {
  test('buildSafePublicId removes unsafe filename characters', () => {
    const publicId = buildSafePublicId('../../avatar & bad<script>.png');

    expect(publicId).toMatch(/^\d+-avatar-bad-script$/);
    expect(publicId).not.toContain('..');
    expect(publicId).not.toContain('&');
    expect(publicId).not.toContain('<');
    expect(publicId).not.toContain('>');
  });

  test('buildSafePublicId falls back when filename is empty after sanitizing', () => {
    expect(buildSafePublicId('***.jpg')).toMatch(/^\d+-image$/);
  });
});
