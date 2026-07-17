const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

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

  /**
   * Gửi email xác nhận đơn hàng
   */
  static async sendOrderConfirmation(userEmail, orderData) {
    try {
      const templatePath = path.join(__dirname, '../templates/emails/order-confirm.html');
      let html = fs.existsSync(templatePath) 
        ? fs.readFileSync(templatePath, 'utf8')
        : '<h1>Cảm ơn bạn đã đặt hàng tại ShopVN!</h1><p>Mã đơn: {{orderId}}</p>';
      
      const formatCurrency = (val) => Number(val).toLocaleString('vi-VN') + ' đ';

      // Map Payment Method to user-friendly text
      const paymentMethods = {
        cod: 'Thanh toán khi nhận hàng (COD)',
        vnpay: 'Ví VNPay / Thẻ ngân hàng',
        momo: 'Ví điện tử MoMo',
        zalopay: 'Ví điện tử ZaloPay',
        bank_transfer: 'Chuyển khoản VietQR (PayOS)'
      };
      const paymentMethodText = paymentMethods[orderData.paymentMethod?.toLowerCase()] || orderData.paymentMethod || 'COD';

      // Build items table rows HTML
      const itemsHTML = (orderData.items || []).map(item => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 8px; font-size: 14px; color: #1e293b; vertical-align: middle;">
            <span style="font-size: 18px; margin-right: 8px; vertical-align: middle;">${item.productIcon || '📦'}</span>
            <span style="font-weight: 600; vertical-align: middle;">${item.productName}</span>
          </td>
          <td align="center" style="padding: 12px 8px; font-size: 14px; color: #64748b; font-weight: 500;">x${item.quantity}</td>
          <td align="right" style="padding: 12px 8px; font-size: 14px; color: #1e293b; font-weight: 600;">${formatCurrency(item.price)}</td>
          <td align="right" style="padding: 12px 8px; font-size: 14px; color: #1e293b; font-weight: 600;">${formatCurrency(item.subtotal)}</td>
        </tr>
      `).join('');

      // Replace template placeholders
      html = html
        .replace(/{{customerName}}/g, orderData.shippingName || 'Quý khách')
        .replace(/{{orderId}}/g, orderData.id || 'N/A')
        .replace(/{{paymentMethod}}/g, paymentMethodText)
        .replace(/{{itemsHTML}}/g, itemsHTML)
        .replace(/{{subtotal}}/g, formatCurrency(orderData.subtotal || 0))
        .replace(/{{shippingFee}}/g, formatCurrency(orderData.shippingFee || 0))
        .replace(/{{discount}}/g, formatCurrency(orderData.discount || 0))
        .replace(/{{total}}/g, formatCurrency(orderData.total || 0))
        .replace(/{{shippingName}}/g, orderData.shippingName || '')
        .replace(/{{shippingPhone}}/g, orderData.shippingPhone || '')
        .replace(/{{shippingAddress}}/g, orderData.shippingAddress || '')
        .replace(/{{note}}/g, orderData.note || 'Không có')
        .replace(/{{frontendUrl}}/g, process.env.FRONTEND_URL || 'http://localhost:5500');

      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"ShopVN" <noreply@shopvn.com>',
        to: userEmail,
        subject: `[ShopVN] Xác nhận đơn hàng #${orderData.id || 'N/A'}`,
        html: html,
        disableFileAccess: true,
        disableUrlAccess: true
      });

      console.log('Email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('[Email Service Error]', error);
    }
  }
}

module.exports = EmailService;
