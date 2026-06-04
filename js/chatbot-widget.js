// Chatbot Widget logic
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tạo giao diện Chatbot
    const chatHTML = `
      <div id="shopvn-chatbot" class="chatbot-container">
        <div class="chatbot-header" onclick="toggleChat()">
          <div class="chatbot-title">✨ Trợ lý ảo ShopVN</div>
          <div class="chatbot-status">Sẵn sàng hỗ trợ</div>
        </div>
        <div class="chatbot-body" id="chatbot-body">
          <div class="chat-message bot">
            Xin chào! Mình là trợ lý ảo của ShopVN. Bạn cần tư vấn sản phẩm hay hỗ trợ đơn hàng ạ?
          </div>
        </div>
        <div class="chatbot-input">
          <input type="text" id="chat-input" placeholder="Nhập tin nhắn..." onkeypress="handleChatKey(event)" />
          <button onclick="sendChatMessage()">Gửi</button>
        </div>
      </div>
      <button class="chatbot-trigger" onclick="toggleChat()">💬</button>
    `;
    
    document.body.insertAdjacentHTML('beforeend', chatHTML);
});

// Hàm hiển thị/ẩn chatbot
window.toggleChat = function() {
    const chatContainer = document.getElementById('shopvn-chatbot');
    chatContainer.classList.toggle('open');
};

// Hàm gửi tin nhắn
window.sendChatMessage = async function() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    appendMessage('user', message);
    input.value = '';

    // Gửi loading
    const loadingId = 'loading-' + Date.now();
    appendMessage('bot', '...', loadingId);

    try {
        const response = await fetch('http://localhost:3000/api/chatbot/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: message,
                context: {
                    page: window.location.pathname
                }
            })
        });

        const result = await response.json();
        
        // Remove loading
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        if (result.success) {
            appendMessage('bot', result.data.reply);
        } else {
            appendMessage('bot', 'Lỗi: ' + result.message);
        }
    } catch (error) {
        document.getElementById(loadingId)?.remove();
        appendMessage('bot', 'Xin lỗi, không thể kết nối tới máy chủ.');
    }
};

window.handleChatKey = function(e) {
    if (e.key === 'Enter') {
        window.sendChatMessage();
    }
};

function appendMessage(sender, text, id = '') {
    const body = document.getElementById('chatbot-body');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}`;
    if (id) msgDiv.id = id;
    msgDiv.textContent = text;
    body.appendChild(msgDiv);
    body.scrollTop = body.scrollHeight;
}
