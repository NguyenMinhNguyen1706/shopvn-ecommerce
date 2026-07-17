jest.mock('../../src/config/redis', () => ({
  cacheUtils: {
    incr: jest.fn()
  }
}));

const { cacheUtils } = require('../../src/config/redis');
const { apiRateLimit } = require('../../src/middlewares/security.middleware');

function createReq() {
  return {
    path: '/products',
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' }
  };
}

function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    set: jest.fn((key, value) => {
      res.headers[key] = value;
      return res;
    }),
    status: jest.fn(code => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn(payload => {
      res.body = payload;
      return res;
    })
  };
  return res;
}

describe('apiRateLimit', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  test('fails closed in production when Redis counter is unavailable', async () => {
    process.env.NODE_ENV = 'production';
    cacheUtils.incr.mockResolvedValue(-1);
    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await apiRateLimit({ max: 10, windowSeconds: 60 })(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  test('fails open in development when Redis counter is unavailable', async () => {
    process.env.NODE_ENV = 'development';
    cacheUtils.incr.mockResolvedValue(-1);
    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await apiRateLimit({ max: 10, windowSeconds: 60 })(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 429 when limit is exceeded', async () => {
    process.env.NODE_ENV = 'production';
    cacheUtils.incr.mockResolvedValue(11);
    const req = createReq();
    const res = createRes();
    const next = jest.fn();

    await apiRateLimit({ max: 10, windowSeconds: 60 })(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.body.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });
});
