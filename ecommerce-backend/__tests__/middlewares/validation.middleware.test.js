const { validate, sanitize, schemas, sanitizeValue } = require('../../src/middlewares/validation.middleware');

function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
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

describe('validation middleware', () => {
  test('rejects invalid register email and short password', () => {
    const req = {
      body: {
        name: 'Nguyen Van A',
        email: 'not-an-email',
        password: '123'
      }
    };
    const res = createMockResponse();
    const next = jest.fn();

    validate(schemas.register)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.map(error => error.field)).toEqual(
      expect.arrayContaining(['email', 'password'])
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects cart quantity less than one', () => {
    const req = {
      body: {
        productId: 1,
        quantity: 0
      }
    };
    const res = createMockResponse();
    const next = jest.fn();

    validate(schemas.addToCart)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.errors[0].field).toBe('quantity');
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts valid checkout payload and strips unknown fields', () => {
    const req = {
      body: {
        shippingName: 'Nguyen Van A',
        shippingPhone: '0905123456',
        shippingAddress: '123 Nguyen Tri Phuong, Da Nang',
        paymentMethod: 'cod',
        unexpected: 'remove-me'
      }
    };
    const res = createMockResponse();
    const next = jest.fn();

    validate(schemas.createOrder)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.unexpected).toBeUndefined();
    expect(req.body.paymentMethod).toBe('cod');
  });
});

describe('sanitize middleware', () => {
  test('removes script tags recursively from body, query, and params', () => {
    const req = {
      body: {
        shippingName: '<script>alert(1)</script>Nguyen',
        items: [
          { note: 'safe <img src=x onerror=alert(1)> text' }
        ]
      },
      query: {
        q: '<b>Laptop</b>'
      },
      params: {
        id: '<script>1</script>'
      }
    };
    const res = createMockResponse();
    const next = jest.fn();

    sanitize(req, res, next);

    expect(req.body.shippingName).toBe('alert(1)Nguyen');
    expect(req.body.items[0].note).toBe('safe  text');
    expect(req.query.q).toBe('Laptop');
    expect(req.params.id).toBe('1');
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('sanitizeValue preserves non-string values', () => {
    expect(sanitizeValue({ quantity: 2, active: true, empty: null })).toEqual({
      quantity: 2,
      active: true,
      empty: null
    });
  });
});
