const Joi = require('joi');

/**
 * Sanitize strings to prevent basic XSS attacks by stripping HTML tags
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/<[^>]*>/g, '');
};

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)])
    );
  }

  return value;
};

/**
 * Sanitize middleware to clean body, query, and params
 */
const sanitize = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
};

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema
 * @param {string} source - 'body', 'query', or 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const details = error.details.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ.',
        errors: details
      });
    }

    // Replace the request data with the validated/cast values
    req[source] = value;
    next();
  };
};

// ── Validation Schemas ────────────────────────────────────────────────────────

const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'any.required': 'Họ tên là bắt buộc.',
      'string.min': 'Họ tên phải có ít nhất {#limit} ký tự.'
    }),
    email: Joi.string().email().required().messages({
      'any.required': 'Email là bắt buộc.',
      'string.email': 'Định dạng email không hợp lệ.'
    }),
    password: Joi.string().min(6).required().messages({
      'any.required': 'Mật khẩu là bắt buộc.',
      'string.min': 'Mật khẩu phải có ít nhất {#limit} ký tự.'
    }),
    phone: Joi.string().pattern(/^[0-9]{10,11}$/).optional().messages({
      'string.pattern.base': 'Số điện thoại không hợp lệ.'
    })
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'any.required': 'Email là bắt buộc.'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Mật khẩu là bắt buộc.'
    })
  }),

  socialLogin: Joi.object({
    provider: Joi.string().valid('google', 'facebook').required(),
    token: Joi.string().required()
  }),

  createProduct: Joi.object({
    name: Joi.string().max(255).required(),
    price: Joi.number().integer().min(0).required(),
    oldPrice: Joi.number().integer().min(0).optional().allow(null),
    description: Joi.string().optional().allow(''),
    category: Joi.string().required(),
    stock: Joi.number().integer().min(0).default(0),
    imageUrl: Joi.string().uri().optional().allow(''),
    icon: Joi.string().optional().allow(''),
    featured: Joi.boolean().default(false),
    isNew: Joi.boolean().default(true)
  }),

  updateProduct: Joi.object({
    name: Joi.string().max(255).optional(),
    price: Joi.number().integer().min(0).optional(),
    oldPrice: Joi.number().integer().min(0).optional().allow(null),
    description: Joi.string().optional().allow(''),
    category: Joi.string().optional(),
    stock: Joi.number().integer().min(0).optional(),
    imageUrl: Joi.string().uri().optional().allow(''),
    icon: Joi.string().optional().allow(''),
    featured: Joi.boolean().optional(),
    isNew: Joi.boolean().optional()
  }),

  addToCart: Joi.object({
    productId: Joi.number().integer().required(),
    quantity: Joi.number().integer().min(1).max(99).required()
  }),

  createOrder: Joi.object({
    shippingName: Joi.string().max(100).required(),
    shippingPhone: Joi.string().pattern(/^[0-9]{10,11}$/).required(),
    shippingAddress: Joi.string().max(500).required(),
    paymentMethod: Joi.string().valid('cod', 'vnpay', 'zalopay', 'momo', 'bank_transfer').default('cod'),
    voucherCode: Joi.string().max(50).optional().allow('', null),
    note: Joi.string().max(1000).optional().allow('', null)
  }),

  createPayment: Joi.object({
    orderId: Joi.number().integer().required(),
    method: Joi.string().valid('vnpay', 'zalopay', 'momo', 'bank_transfer').required()
  }),

  createReview: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(1000).optional().allow('', null)
  }),

  calculateShipping: Joi.object({
    fromDistrictId: Joi.number().integer().optional(),
    toDistrictId: Joi.number().integer().required(),
    toWardCode: Joi.string().required(),
    weight: Joi.number().integer().min(1).default(1000), // grams
    items: Joi.array().items(
      Joi.object({
        productId: Joi.number().integer().required(),
        quantity: Joi.number().integer().min(1).required()
      })
    ).optional()
  }),

  chatbotAsk: Joi.object({
    message: Joi.string().max(2000).required()
  }),

  updateOrderStatus: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled').required()
  }),

  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().optional().allow(''),
    minPrice: Joi.number().integer().min(0).optional(),
    maxPrice: Joi.number().integer().min(0).optional(),
    rating: Joi.number().min(1).max(5).optional(),
    q: Joi.string().optional().allow('')
  })
};

module.exports = {
  validate,
  sanitize,
  sanitizeString,
  sanitizeValue,
  schemas
};
