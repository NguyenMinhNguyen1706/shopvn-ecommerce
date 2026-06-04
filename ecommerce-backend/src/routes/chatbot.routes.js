const express = require('express');
const router = express.Router();
const GeminiService = require('../services/gemini.service');

router.post('/ask', async (req, res) => {
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
