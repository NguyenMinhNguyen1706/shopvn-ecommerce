const {
  ipMatches,
  normalizeIp,
  requireWebhookIP
} = require('../../src/middlewares/webhook-security.middleware');

const createResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res)
  };
  return res;
};

describe('webhook IP security middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PAYOS_ALLOWED_IPS;
    delete process.env.REQUIRE_WEBHOOK_IP_ALLOWLIST;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('normalizes IPv4-mapped addresses', () => {
    expect(normalizeIp('::ffff:203.0.113.5')).toBe('203.0.113.5');
    expect(ipMatches('::ffff:203.0.113.5', ['203.0.113.5'])).toBe(true);
  });

  test('relies on provider signatures when no allowlist is configured', () => {
    const next = jest.fn();
    requireWebhookIP('payos')(
      { ip: '203.0.113.5', socket: {} },
      createResponse(),
      next
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('fails closed without an allowlist when strict mode is enabled', () => {
    process.env.REQUIRE_WEBHOOK_IP_ALLOWLIST = 'true';
    const res = createResponse();
    const next = jest.fn();

    requireWebhookIP('payos')({ ip: '203.0.113.5', socket: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts only configured provider IPs', () => {
    process.env.PAYOS_ALLOWED_IPS = '203.0.113.5, 198.51.100.10';
    const middleware = requireWebhookIP('payos');
    const allowedNext = jest.fn();
    middleware({ ip: '::ffff:203.0.113.5', socket: {} }, createResponse(), allowedNext);
    expect(allowedNext).toHaveBeenCalledTimes(1);

    const deniedResponse = createResponse();
    const deniedNext = jest.fn();
    middleware({ ip: '192.0.2.1', socket: {} }, deniedResponse, deniedNext);
    expect(deniedResponse.status).toHaveBeenCalledWith(403);
    expect(deniedNext).not.toHaveBeenCalled();
  });
});
