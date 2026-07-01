import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter | null = null;

function isEmailConfigured() {
  return Boolean(env.SMTP_HOST && env.EMAIL_FROM);
}

function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const subject = 'Reset your ComeUp password';
  const text = [
    `Hi ${input.name},`,
    '',
    'We received a request to reset your ComeUp password.',
    'Open this link to choose a new password (valid for 1 hour):',
    input.resetUrl,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = `
    <p>Hi ${input.name},</p>
    <p>We received a request to reset your ComeUp password.</p>
    <p><a href="${input.resetUrl}">Reset your password</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  const mailer = getTransporter();
  if (!mailer) {
    if (env.NODE_ENV === 'development') {
      console.info(`[email] Password reset for ${input.to}: ${input.resetUrl}`);
      return;
    }
    throw new Error('Email service is not configured');
  }

  await mailer.sendMail({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    text,
    html,
  });
}
