const nodemailer = require('nodemailer');
const EmailService = require('../../src/services/email.service');

jest.mock('nodemailer', () => ({
  createTransport: jest.fn()
}));

describe('EmailService', () => {
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('creates transporter with file and URL access disabled', () => {
    nodemailer.createTransport.mockReturnValue({ sendMail: jest.fn() });

    EmailService.getTransporter();

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        disableFileAccess: true,
        disableUrlAccess: true
      })
    );
  });

  test('sendOrderConfirmation disables file and URL access on message', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'test-message' });
    nodemailer.createTransport.mockReturnValue({ sendMail });

    await EmailService.sendOrderConfirmation('buyer@example.com', {
      id: 123,
      shippingName: 'Nguyen Van A',
      shippingPhone: '0905123456',
      shippingAddress: 'Da Nang',
      paymentMethod: 'cod',
      items: [],
      total: 100000
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@example.com',
        disableFileAccess: true,
        disableUrlAccess: true
      })
    );
  });
});
