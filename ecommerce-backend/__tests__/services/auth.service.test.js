const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../../src/models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  scope: jest.fn()
}));

jest.mock('../../src/config/redis', () => ({
  cacheUtils: {
    set: jest.fn(),
    del: jest.fn(),
    blacklistToken: jest.fn()
  }
}));

const User = require('../../src/models/User');
const { cacheUtils } = require('../../src/config/redis');
const authService = require('../../src/services/auth.service');

describe('auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  test('register hashes password and stores hashed refresh token', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async payload => ({
      id: 10,
      role: 'user',
      ...payload
    }));
    User.update.mockResolvedValue([1]);

    const result = await authService.register({
      name: 'Nguyen Van A',
      email: 'buyer@example.com',
      phone: '0905123456',
      password: 'secret123'
    });

    const createPayload = User.create.mock.calls[0][0];
    expect(createPayload.password).not.toBe('secret123');
    await expect(bcrypt.compare('secret123', createPayload.password)).resolves.toBe(true);
    expect(User.update).toHaveBeenCalledWith(
      { refreshToken: expect.stringMatching(/^[a-f0-9]{64}$/) },
      { where: { id: 10 } }
    );
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user).toEqual(expect.objectContaining({
      id: 10,
      email: 'buyer@example.com',
      role: 'user'
    }));
  });

  test('login rejects wrong password with generic 401', async () => {
    const scopedUser = {
      findOne: jest.fn().mockResolvedValue({
        id: 10,
        email: 'buyer@example.com',
        role: 'user',
        password: await bcrypt.hash('correct-password', 4)
      })
    };
    User.scope.mockReturnValue(scopedUser);

    await expect(authService.login({
      email: 'buyer@example.com',
      password: 'wrong-password'
    })).rejects.toMatchObject({ status: 401 });
  });

  test('refresh detects token reuse and revokes stored refresh token', async () => {
    const refreshToken = jwt.sign(
      { id: 10, email: 'buyer@example.com', role: 'user' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    const scopedUser = {
      findOne: jest.fn().mockResolvedValue({
        id: 10,
        email: 'buyer@example.com',
        role: 'user',
        refreshToken: 'different-hash'
      })
    };
    User.scope.mockReturnValue(scopedUser);
    User.update.mockResolvedValue([1]);

    await expect(authService.refresh(refreshToken)).rejects.toMatchObject({ status: 401 });
    expect(User.update).toHaveBeenCalledWith(
      { refreshToken: null },
      { where: { id: 10 } }
    );
    expect(cacheUtils.del).toHaveBeenCalledWith('user:auth:10');
  });
});
