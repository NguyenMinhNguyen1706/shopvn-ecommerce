const { validateSecrets, getSecret } = require('../../src/config/secrets');

describe('secret configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://shopvn:test@localhost:5432/shopvn_test',
      JWT_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret'
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('accepts distinct secrets in a non-production environment', () => {
    expect(() => validateSecrets()).not.toThrow();
  });

  test('rejects short JWT secrets in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_URL = 'https://shop.example';
    process.env.WEBHOOK_SHARED_SECRET = 'w'.repeat(32);

    expect(() => validateSecrets()).toThrow(/ít nhất 32 ký tự/);
  });

  test('rejects reused access and refresh secrets', () => {
    process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
    expect(() => validateSecrets()).toThrow(/phải khác nhau/);
  });

  test('requires production frontend and marketplace webhook configuration', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
    delete process.env.FRONTEND_URL;
    delete process.env.WEBHOOK_SHARED_SECRET;

    expect(() => validateSecrets()).toThrow(/WEBHOOK_SHARED_SECRET[\s\S]*FRONTEND_URL/);
  });

  test('returns the supplied fallback only when a variable is undefined', () => {
    process.env.EMPTY_VALUE = '';
    expect(getSecret('EMPTY_VALUE', 'fallback')).toBe('');
    expect(getSecret('MISSING_VALUE', 'fallback')).toBe('fallback');
  });
});
