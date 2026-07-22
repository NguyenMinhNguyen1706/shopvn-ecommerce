const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function replaceToken(template, token, value) {
  return template.replace(new RegExp(`{{${token}}}`, 'g'), () => String(value));
}

class EmailService {
  static getTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      disableFileAccess: true,
      disableUrlAccess: true,
      auth: {
        user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
        pass: process.env.EMAIL_PASS || 'mock_password'
      }
    });
  }

  static async sendOrderConfirmation(userEmail, orderData) {
    const templatePath = path.join(__dirname, '../templates/emails/order-confirm.html');
    let html = fs.existsSync(templatePath)
      ? fs.readFileSync(templatePath, 'utf8')
      : '<h1>Cảm ơn bạn đã đặt hàng tại ShopVN!</h1><p>Mã đơn: {{orderId}}</p>';

    const formatCurrency = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
    const paymentMethods = {
      cod: 'Thanh toán khi nhận hàng (COD)',
      vnpay: 'VNPay / Thẻ ngân hàng',
      momo: 'Ví điện tử MoMo',
      zalopay: 'Ví điện tử ZaloPay',
      bank_transfer: 'Chuyển khoản VietQR (PayOS)'
    };
    const paymentMethod = String(orderData.paymentMethod || 'cod').toLowerCase();
    const paymentMethodText = paymentMethods[paymentMethod] || 'Không xác định';

    const itemsHTML = (orderData.items || []).map(item => `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:12px 8px;font-size:14px;color:#1e293b;font-weight:600">${escapeHtml(item.productName || 'Sản phẩm')}</td>
        <td align="center" style="padding:12px 8px;font-size:14px;color:#64748b;font-weight:500">x${Number(item.quantity) || 0}</td>
        <td align="right" style="padding:12px 8px;font-size:14px;color:#1e293b;font-weight:600">${formatCurrency(item.price)}</td>
        <td align="right" style="padding:12px 8px;font-size:14px;color:#1e293b;font-weight:600">${formatCurrency(item.subtotal)}</td>
      </tr>
    `).join('');

    const safeNote = escapeHtml(orderData.note || 'Không có').replace(/\r?\n/g, '<br>');
    const replacements = {
      customerName: escapeHtml(orderData.shippingName || 'Quý khách'),
      orderId: escapeHtml(orderData.id || 'N/A'),
      paymentMethod: escapeHtml(paymentMethodText),
      itemsHTML,
      subtotal: formatCurrency(orderData.subtotal),
      shippingFee: formatCurrency(orderData.shippingFee),
      discount: formatCurrency(orderData.discount),
      total: formatCurrency(orderData.total),
      shippingName: escapeHtml(orderData.shippingName),
      shippingPhone: escapeHtml(orderData.shippingPhone),
      shippingAddress: escapeHtml(orderData.shippingAddress),
      note: safeNote,
      frontendUrl: escapeHtml(process.env.FRONTEND_URL || 'http://localhost:5500')
    };

    Object.entries(replacements).forEach(([token, value]) => {
      html = replaceToken(html, token, value);
    });

    const safeOrderId = String(orderData.id || 'N/A').replace(/[\r\n]/g, '');
    const transporter = this.getTransporter();
    return transporter.sendMail({
      from: process.env.EMAIL_FROM || '"ShopVN" <noreply@shopvn.com>',
      to: userEmail,
      subject: `[ShopVN] Xác nhận đơn hàng #${safeOrderId}`,
      html,
      disableFileAccess: true,
      disableUrlAccess: true
    });
  }
}

module.exports = EmailService;
module.exports.escapeHtml = escapeHtml;