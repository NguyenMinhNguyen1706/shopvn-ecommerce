const { GoogleGenAI } = require('@google/genai');


// Khởi tạo Gemini SDK (yêu cầu GEMINI_API_KEY trong .env)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'MOCK_KEY' });

class GeminiService {
  /**
   * Sinh câu trả lời từ Gemini
   * @param {string} userMessage Câu hỏi của khách hàng
   * @param {Object} context Ngữ cảnh (ví dụ: sản phẩm đang xem, giỏ hàng)
   */
  static async ask(userMessage, context = {}) {
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
        // Trả về mock response nếu chưa có key thật
        return "Xin chào! Hiện tại tính năng Chatbot đang trong chế độ thử nghiệm (Chưa có API Key). Bạn cần hỗ trợ gì thêm về sản phẩm của ShopVN không?";
      }

      const systemInstruction = `
        Bạn là trợ lý ảo thân thiện, chuyên nghiệp của hệ thống thương mại điện tử ShopVN.
        Quy tắc trả lời:
        1. Luôn giữ thái độ lịch sự, xưng "mình" và gọi khách là "bạn" hoặc "quý khách".
        2. Tư vấn các vấn đề về mua hàng, bảo hành (12-24 tháng), đổi trả (30 ngày).
        3. Dựa vào ngữ cảnh để trả lời: ${JSON.stringify(context)}
        4. Trả lời ngắn gọn, súc tích (dưới 100 chữ nếu có thể).
        5. Nếu không biết, hãy bảo khách hàng liên hệ hotline 1900 xxxx.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      return response.text;
    } catch (error) {
      console.error('[Gemini Service Error]', error);
      return "Xin lỗi, hệ thống Chatbot của chúng tôi đang quá tải. Vui lòng thử lại sau ít phút hoặc liên hệ hotline!";
    }
  }
}

module.exports = GeminiService;

