const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

class EmailService {
  static getTransporter() {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
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
      
      html = html.replace('{{orderId}}', orderData.id || 'N/A');

      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: '"ShopVN" <noreply@shopvn.com>',
        to: userEmail,
        subject: `[ShopVN] Xác nhận đơn hàng #${orderData.id || 'N/A'}`,
        html: html
      });

      console.log('Email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('[Email Service Error]', error);
    }
  }
}

module.exports = EmailService;
