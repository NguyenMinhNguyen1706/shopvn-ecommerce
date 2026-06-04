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
        <div class="compare-empty__icon">⚖️</div>
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
              <button class="compare-product-header__remove" onclick="removeCompareItem(${p.id})" title="Xóa khỏi so sánh">×</button>
              <div class="compare-product-header__icon" onclick="window.location.href='product-detail.html?id=${p.id}'" style="cursor:pointer">${p.icon || '📦'}</div>
              <div class="compare-product-header__name" onclick="window.location.href='product-detail.html?id=${p.id}'" style="cursor:pointer" title="${p.name}">${p.name}</div>
              <div class="compare-product-header__price">${formatPrice(p.price)}</div>
              <button class="btn btn-primary btn-sm btn-full" style="justify-content:center" onclick="LocalCart.add(${JSON.stringify(p).replace(/"/g, '&quot;')}, 1); showToast('Đã thêm vào giỏ hàng', 'success'); updateCartBadge();">
                🛒 Thêm giỏ hàng
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

          return `<td class="compare-attr ${isMissing ? 'compare-attr--missing' : ''}">${displayVal}</td>`;
        }).join('')}
      </tr>
    `;
  });

  // Dummy specs for showcase
  const mockSpecs = [
    { label: 'Thương hiệu', values: ['Apple', 'Samsung', 'Sony', 'Asus', 'Dell'] },
    { label: 'Bảo hành', values: ['12 tháng chính hãng', '24 tháng', '6 tháng'] },
    { label: 'Trọng lượng', values: ['1.2 kg', '180 g', '2.5 kg', '500 g'] }
  ];

  mockSpecs.forEach((spec, index) => {
    tbodyHtml += `
      <tr>
        <th class="compare-table__label-col">${spec.label}</th>
        ${items.map(p => {
           // Giả lập specs dựa trên ID để có tính nhất quán
           const valIndex = (p.id + index) % spec.values.length;
           return `<td class="compare-attr">${spec.values[valIndex]}</td>`;
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

function removeCompareItem(productId) {
  CompareList.remove(productId);
  renderCompareTable();
}
