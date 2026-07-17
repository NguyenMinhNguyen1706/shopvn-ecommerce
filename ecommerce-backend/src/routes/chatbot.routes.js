const express = require('express');
const router = express.Router();
const GeminiService = require('../services/gemini.service');
const { validate, schemas } = require('../middlewares/validation.middleware');
const rateLimit = require('express-rate-limit');

// Protect Gemini chatbot endpoint from DDoS and API key exhaustion
const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                 // 30 requests per 15 minutes
  message: {
    success: false,
    message: 'Bạn đã gửi quá nhiều câu hỏi đến chatbot. Vui lòng thử lại sau 15 phút.'
  }
});

router.post('/ask', chatbotLimiter, validate(schemas.chatbotAsk), async (req, res, next) => {
  try {
    const { message, context } = req.body;
    const reply = await GeminiService.ask(message, context);
    
    res.json({
      success: true,
      data: {
        reply
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
