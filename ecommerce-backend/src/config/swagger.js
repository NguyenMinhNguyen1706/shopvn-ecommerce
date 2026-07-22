const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'ShopVN API',
      version:     '1.0.0',
      description: 'ShopVN REST API - Node.js, Express, PostgreSQL',
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://127.0.0.1:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Local development'
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Đọc JSDoc comments từ các file routes
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
