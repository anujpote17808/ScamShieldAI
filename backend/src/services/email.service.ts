import nodemailer from 'nodemailer';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure =
  String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';

const smtpUser = getRequiredEnv('SMTP_USER');
const smtpPass = getRequiredEnv('SMTP_PASS');

const mailFrom = process.env.MAIL_FROM || smtpUser;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendPasswordResetOtp(
  email: string,
  otp: string,
): Promise<void> {
  await transporter.sendMail({
    from: mailFrom,
    to: email,
    subject: 'Your ScamShield AI password reset OTP',
    text: [
      'Your ScamShield AI password reset code is:',
      '',
      otp,
      '',
      'This OTP will expire in 10 minutes.',
      '',
      'If you did not request a password reset, you can safely ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px;">
        <h2 style="margin-bottom: 8px;">ScamShield AI</h2>

        <p>You requested to reset your password.</p>

        <p>Your verification code is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          padding: 18px;
          background: #f4f4f5;
          border-radius: 10px;
          text-align: center;
          margin: 20px 0;
        ">
          ${otp}
        </div>

        <p>
          This OTP will expire in <strong>10 minutes</strong>.
        </p>

        <p style="color: #666;">
        </p>
      </div>
    `,
  });
}

export async function sendTwoFactorOtp(
  email: string,
  otp: string,
): Promise<void> {
  await transporter.sendMail({
    from: mailFrom,
    to: email,
    subject: 'Your ScamShield AI Two-Factor Authentication Code',
    text: [
      'Your ScamShield AI verification code is:',
      '',
      otp,
      '',
      'This code will expire in 10 minutes.',
      '',
      'If you did not request this, please secure your account immediately.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px;">
        <h2 style="margin-bottom: 8px;">ScamShield AI</h2>

        <p>Your two-factor authentication code is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          padding: 18px;
          background: #f4f4f5;
          border-radius: 10px;
          text-align: center;
          margin: 20px 0;
        ">
          ${otp}
        </div>

        <p>
          This code will expire in <strong>10 minutes</strong>.
        </p>

        <p style="color: #666;">
          If you did not request this, please secure your account immediately.
        </p>
      </div>
    `,
  });
}