document.addEventListener('DOMContentLoaded', () => {
    // 1. Tạo giao diện Trigger & Modal
    const wheelHTML = `
      <!-- Trigger Button -->
      <button class="lucky-wheel-trigger" id="wheel-trigger" title="Vòng quay may mắn">
        🎁
      </button>

      <!-- Modal Overlay -->
      <div class="lucky-wheel-overlay" id="wheel-overlay">
        <div class="lucky-wheel-modal">
          <button class="lucky-wheel-close" id="wheel-close" type="button" aria-label="Đóng vòng quay may mắn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <h2 class="lucky-wheel-title">Vòng Quay May Mắn</h2>
          <p class="lucky-wheel-subtitle">Cơ hội nhận ngàn ưu đãi 2024</p>
          
          <div class="wheel-container">
            <div class="wheel-pointer"></div>
            <div class="wheel" id="wheel">
              <div class="wheel-section"><span>Voucher 50K</span></div>
              <div class="wheel-section"><span>Freeship</span></div>
              <div class="wheel-section"><span>Voucher 100K</span></div>
              <div class="wheel-section"><span>Chúc may mắn</span></div>
              <div class="wheel-section"><span>Giảm 10%</span></div>
              <div class="wheel-section"><span>Quà Bí Mật</span></div>
            </div>
          </div>
          
          <button class="spin-btn" id="spin-btn">QUAY NGAY</button>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', wheelHTML);

    // 2. Logic Vòng quay
    const trigger = document.getElementById('wheel-trigger');
    const overlay = document.getElementById('wheel-overlay');
    window.LuckyWheel = { open: () => overlay.classList.add('active') };
    const closeBtn = document.getElementById('wheel-close');
    const spinBtn = document.getElementById('spin-btn');
    const wheel = document.getElementById('wheel');
    
    let isSpinning = false;
    let currentDegree = 0;
    
    // Prizes array matching the 6 slices
    const prizes = [
      'Voucher 50K',      // 0-60
      'Freeship',         // 60-120
      'Voucher 100K',     // 120-180
      'Chúc bạn may mắn', // 180-240
      'Giảm 10%',         // 240-300
      'Quà Bí Mật'        // 300-360
    ];

    // Mở / Đóng modal
    trigger.addEventListener('click', () => overlay.classList.add('active'));
    closeBtn.addEventListener('click', () => {
      if (!isSpinning) overlay.classList.remove('active');
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && !isSpinning) {
        overlay.classList.remove('active');
      }
    });

    // Quay
    spinBtn.addEventListener('click', () => {
      if (isSpinning) return;
      isSpinning = true;
      spinBtn.disabled = true;
      spinBtn.textContent = 'ĐANG QUAY...';
      
      // Tính toán độ quay ngẫu nhiên (Quay ít nhất 5 vòng + độ ngẫu nhiên)
      const randomDegree = Math.floor(Math.random() * 360);
      const totalDegree = currentDegree + 1800 + randomDegree; // 1800 = 5 vòng
      currentDegree = totalDegree;
      
      wheel.style.transform = `rotate(${totalDegree}deg)`;
      
      // Xử lý sau khi quay xong (Trùng khớp với transition duration 4s)
      setTimeout(() => {
        isSpinning = false;
        spinBtn.disabled = false;
        spinBtn.textContent = 'QUAY NGAY';
        
        // Tính toán giải thưởng (Do wheel bị quay xuôi chiều kim đồng hồ, kim chỉ nằm ở 0 độ góc trên cùng)
        // Cần tính ngược lại để biết ô nào trúng
        const actualDegree = totalDegree % 360;
        const sliceIndex = Math.floor((360 - actualDegree) % 360 / 60);
        const wonPrize = prizes[sliceIndex];
        
        if (wonPrize === 'Chúc bạn may mắn') {
          alert('Rất tiếc! Chúc bạn may mắn lần sau nhé.');
        } else {
          alert(`🎉 CHÚC MỪNG! Bạn đã trúng: ${wonPrize} 🎉\nVui lòng kiểm tra email để nhận mã giảm giá.`);
        }
      }, 4000);
    });
});

