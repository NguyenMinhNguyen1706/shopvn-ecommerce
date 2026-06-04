/**
 * lucky-wheel.js — Vòng quay may mắn (Gamification)
 * Inspired by Shopee Lucky Wheel / Mini Games
 */

const LuckyWheel = (() => {
  const SPIN_KEY = 'lucky_wheel_last_spin';
  const DAILY_LIMIT = 1;

  const PRIZES = [
    { label: 'Giảm 10%',    color: '#1565C0', textColor: '#fff', type: 'coupon', value: 'LUCKY10',   desc: 'Mã giảm 10% (tối đa 200k)' },
    { label: 'Free Ship',   color: '#FF6B35', textColor: '#fff', type: 'coupon', value: 'FREESHIP',  desc: 'Miễn phí vận chuyển' },
    { label: '50 Xu',       color: '#2E7D32', textColor: '#fff', type: 'xu',     value: 50,          desc: '50 ShopVN Xu' },
    { label: 'Giảm 50k',   color: '#7B1FA2', textColor: '#fff', type: 'coupon', value: 'WELCOME50', desc: 'Mã giảm 50.000đ' },
    { label: 'Chúc may mắn', color: '#E0E0E0', textColor: '#666', type: 'none',  value: null,        desc: 'Chưa trúng lần này, thử lại ngày mai!' },
    { label: '100 Xu',      color: '#C62828', textColor: '#fff', type: 'xu',     value: 100,         desc: '100 ShopVN Xu' },
    { label: 'Giảm 20%',   color: '#00838F', textColor: '#fff', type: 'coupon', value: 'SUMMER20',  desc: 'Mã giảm 20% (tối đa 500k)' },
    { label: '20 Xu',       color: '#EF6C00', textColor: '#fff', type: 'xu',     value: 20,          desc: '20 ShopVN Xu' },
  ];

  // Weighted probabilities (index → weight)
  const WEIGHTS = [15, 20, 20, 10, 25, 5, 3, 20]; // "Chúc may mắn" has highest chance

  let spinning = false;

  function canSpin() {
    const last = localStorage.getItem(SPIN_KEY);
    if (!last) return true;
    const lastDate = new Date(parseInt(last)).toDateString();
    const today = new Date().toDateString();
    return lastDate !== today;
  }

  function recordSpin() {
    localStorage.setItem(SPIN_KEY, Date.now().toString());
  }

  function getRandomPrize() {
    const totalWeight = WEIGHTS.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < WEIGHTS.length; i++) {
      rand -= WEIGHTS[i];
      if (rand <= 0) return i;
    }
    return WEIGHTS.length - 1;
  }

  function createModal() {
    if (document.getElementById('lucky-wheel-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'lucky-wheel-modal';
    overlay.className = 'lw-overlay';
    overlay.innerHTML = `
      <div class="lw-modal">
        <button class="lw-close" onclick="LuckyWheel.close()" aria-label="Đóng">×</button>
        <h2 class="lw-title">🎰 Vòng Quay May Mắn</h2>
        <p class="lw-subtitle">Quay mỗi ngày để nhận voucher & xu thưởng!</p>
        <div class="lw-canvas-wrap">
          <canvas id="lw-canvas" width="320" height="320"></canvas>
          <div class="lw-pointer">▼</div>
        </div>
        <button class="lw-spin-btn" id="lw-spin-btn" onclick="LuckyWheel.spin()">
          QUAY NGAY
        </button>
        <div class="lw-result" id="lw-result" style="display:none"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    drawWheel(0);
  }

  function drawWheel(rotation) {
    const canvas = document.getElementById('lw-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 8;
    const sliceAngle = (2 * Math.PI) / PRIZES.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    PRIZES.forEach((prize, i) => {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = prize.textColor;
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(prize.label, r - 16, 4);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1565C0';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QUAY', 0, 0);

    ctx.restore();

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(21,101,192,0.2)';
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  function spin() {
    if (spinning) return;

    if (!canSpin()) {
      showToast('Bạn đã quay hôm nay rồi! Quay lại ngày mai nhé 🎁', 'warning');
      return;
    }

    spinning = true;
    const btn = document.getElementById('lw-spin-btn');
    const resultEl = document.getElementById('lw-result');
    btn.disabled = true;
    btn.textContent = 'Đang quay...';
    resultEl.style.display = 'none';

    const prizeIndex = getRandomPrize();
    const sliceAngle = (2 * Math.PI) / PRIZES.length;
    // Calculate target rotation: spin multiple rounds + land on prize
    const targetAngle = (2 * Math.PI) * (5 + Math.random() * 3) - (prizeIndex * sliceAngle + sliceAngle / 2);

    let currentAngle = 0;
    const startTime = Date.now();
    const duration = 4000; // 4 seconds

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      currentAngle = targetAngle * ease;
      drawWheel(currentAngle);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Done!
        spinning = false;
        recordSpin();
        showPrize(prizeIndex);
      }
    }

    requestAnimationFrame(animate);
  }

  function showPrize(index) {
    const prize = PRIZES[index];
    const resultEl = document.getElementById('lw-result');
    const btn = document.getElementById('lw-spin-btn');

    btn.textContent = 'Đã quay xong!';
    btn.disabled = true;

    if (prize.type === 'none') {
      resultEl.innerHTML = `
        <div class="lw-result__icon">😅</div>
        <div class="lw-result__text">${prize.desc}</div>
      `;
    } else if (prize.type === 'xu') {
      // Award xu
      const current = LoyaltyPoints.getBalance();
      localStorage.setItem(LoyaltyPoints.KEY, String(current + prize.value));
      LoyaltyPoints.updateNavbarBadge();
      resultEl.innerHTML = `
        <div class="lw-result__icon">🎉</div>
        <div class="lw-result__text">Chúc mừng! Bạn nhận được <strong>${prize.label}</strong>!</div>
        <div class="lw-result__sub">${prize.desc} - Đã cộng vào tài khoản</div>
      `;
      showConfetti();
    } else {
      resultEl.innerHTML = `
        <div class="lw-result__icon">🎉</div>
        <div class="lw-result__text">Chúc mừng! Bạn nhận được <strong>${prize.label}</strong>!</div>
        <div class="lw-result__sub">${prize.desc}</div>
        <div class="lw-result__code">Mã: <strong>${prize.value}</strong></div>
      `;
      showConfetti();
    }
    resultEl.style.display = 'block';
  }

  function showConfetti() {
    const colors = ['#FF6B35', '#1565C0', '#2E7D32', '#C62828', '#FFD700', '#7B1FA2'];
    const container = document.querySelector('.lw-modal');
    if (!container) return;

    for (let i = 0; i < 40; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'lw-confetti';
      confetti.style.cssText = `
        left: ${Math.random() * 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-delay: ${Math.random() * 0.5}s;
        animation-duration: ${1 + Math.random()}s;
      `;
      container.appendChild(confetti);
      setTimeout(() => confetti.remove(), 2000);
    }
  }

  function open() {
    createModal();
    requestAnimationFrame(() => {
      document.getElementById('lucky-wheel-modal')?.classList.add('open');
    });
    document.body.style.overflow = 'hidden';
    // Reset button if needed
    const btn = document.getElementById('lw-spin-btn');
    if (btn && canSpin()) {
      btn.disabled = false;
      btn.textContent = 'QUAY NGAY';
    } else if (btn) {
      btn.disabled = true;
      btn.textContent = 'Đã quay hôm nay';
    }
    const resultEl = document.getElementById('lw-result');
    if (resultEl) resultEl.style.display = 'none';
  }

  function close() {
    const modal = document.getElementById('lucky-wheel-modal');
    if (modal) {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 350);
    }
    document.body.style.overflow = '';
  }

  function initFab() {
    if (window.location.pathname.includes('/admin/')) return;
    if (document.getElementById('lucky-wheel-fab')) return;

    const fab = document.createElement('button');
    fab.id = 'lucky-wheel-fab';
    fab.className = 'lucky-wheel-fab';
    fab.setAttribute('aria-label', 'Vòng quay may mắn');
    fab.innerHTML = '🎁';
    fab.onclick = open;
    document.body.appendChild(fab);
  }

  // Auto-init
  document.addEventListener('DOMContentLoaded', initFab);

  return { open, close, spin };
})();
