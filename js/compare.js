/**
 * compare.js — Logic trang so sánh sản phẩm
 * Đọc từ CompareList (localStorage) và render bảng so sánh
 */

document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuth();
  updateCartBadge();
  renderCompareTable();
});

function renderCompareTable() {
  const wrapper = document.getElementById('compare-table-wrapper');
  if (!wrapper) return;

  const items = CompareList.get();

  if (items.length === 0) {
    wrapper.style.border = 'none';
    wrapper.style.boxShadow = 'none';
    wrapper.style.background = 'transparent';
    wrapper.innerHTML = `
      <div class="compare-empty">
        <div class="compare-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m16 16 3-8 3 8a5 5 0 0 1-6 0ZM2 16l3-8 3 8a5 5 0 0 1-6 0ZM7 21h10M12 3v18M3 7h18"/></svg>
        </div>
        <h2 class="compare-empty__title">Chưa có sản phẩm nào để so sánh</h2>
        <p class="compare-empty__desc">Vui lòng thêm ít nhất một sản phẩm vào danh sách so sánh từ trang sản phẩm.</p>
        <a href="products.html" class="btn btn-primary">
          Khám phá sản phẩm
        </a>
      </div>
    `;
    return;
  }

  // Khôi phục styles nếu trước đó empty
  wrapper.style.border = '';
  wrapper.style.boxShadow = '';
  wrapper.style.background = '';

  // Các thuộc tính cần so sánh
  const attributes = [
    { key: 'category', label: 'Danh mục' },
    { key: 'brand', label: 'Thương hiệu' },
    { key: 'warranty', label: 'Bảo hành' },
    { key: 'stock', label: 'Tình trạng kho' },
    { key: 'isNew', label: 'Hàng mới' },
    { key: 'description', label: 'Mô tả ngắn' }
  ];

  // Tính toán HTML cho từng cột sản phẩm
  let theadHtml = `
    <thead>
      <tr>
        <th class="compare-table__label-col">Sản phẩm</th>
        ${items.map(p => `
          <th class="compare-table__product-col">
            <div class="compare-product-header">
              <button class="compare-product-header__remove" onclick="removeCompareItem(${p.id})" title="Xóa khỏi so sánh" aria-label="Xóa ${escapeHtml(p.name)} khỏi so sánh">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
              <a class="compare-product-header__icon" href="product-detail.html?id=${encodeURIComponent(p.id)}" aria-label="Xem ${escapeHtml(p.name)}">${productMediaMarkup(p)}</a>
              <a class="compare-product-header__name" href="product-detail.html?id=${encodeURIComponent(p.id)}" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</a>
              <div class="compare-product-header__price">${formatPrice(p.price)}</div>
              <button class="btn btn-primary btn-sm btn-full" style="justify-content:center" onclick="addCompareItemToCart(${p.id})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h7.84a2 2 0 0 0 2-1.61L20.2 7H5.12"/></svg>
                Thêm vào giỏ
              </button>
            </div>
          </th>
        `).join('')}
      </tr>
    </thead>
  `;

  let tbodyHtml = `<tbody>`;

  attributes.forEach(attr => {
    tbodyHtml += `
      <tr>
        <th class="compare-table__label-col">${attr.label}</th>
        ${items.map(p => {
          let val = p[attr.key];
          let displayVal = '';
          let isMissing = false;

          if (attr.key === 'stock') {
            displayVal = val > 0 ? `Còn hàng (${val})` : 'Hết hàng';
          } else if (attr.key === 'isNew') {
            displayVal = val ? 'Có' : 'Không';
          } else if (attr.key === 'description') {
            displayVal = val || '';
            if (displayVal.length > 100) displayVal = displayVal.substring(0, 100) + '...';
          } else {
            displayVal = val;
          }

          if (!displayVal && displayVal !== 0) {
            displayVal = '-';
            isMissing = true;
          }

          return `<td class="compare-attr ${isMissing ? 'compare-attr--missing' : ''}">${escapeHtml(displayVal)}</td>`;
        }).join('')}
      </tr>
    `;
  });

  tbodyHtml += `</tbody>`;

  wrapper.innerHTML = `
    <table class="compare-table">
      ${theadHtml}
      ${tbodyHtml}
    </table>
  `;
}

function addCompareItemToCart(productId) {
  const product = CompareList.get().find(item => item.id === productId);
  if (!product) return;
  LocalCart.add(product, 1);
  updateCartBadge();
}

function removeCompareItem(productId) {
  CompareList.remove(productId);
  renderCompareTable();
}
