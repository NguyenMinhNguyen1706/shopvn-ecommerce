const express = require('express');
const router = express.Router();
const GeminiService = require('../services/gemini.service');
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

router.post('/ask', chatbotLimiter, async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tin nhắn' });
    }

    const reply = await GeminiService.ask(message, context);
    
    res.json({
      success: true,
      data: {
        reply
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
