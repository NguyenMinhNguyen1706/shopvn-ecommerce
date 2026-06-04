const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'ShopVN API',
      version:     '1.0.0',
      description: 'E-Commerce Backend API — Node.js + Express + PostgreSQL',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
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
