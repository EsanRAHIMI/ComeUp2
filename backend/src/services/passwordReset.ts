import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { sendPasswordResetEmail } from './emailService.js';

const RESET_TTL_MS = 60 * 60 * 1000;

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildResetUrl(token: string) {
  const base = env.FRONTEND_URL.replace(/\/$/, '');
  return `${base}/?token=${encodeURIComponent(token)}`;
}

export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalized });
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashResetToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
  await user.save();

  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl: buildResetUrl(rawToken),
  });
}

export async function resetPasswordWithToken(token: string, password: string) {
  const tokenHash = hashResetToken(token.trim());
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires +passwordHash');

  if (!user) {
    throw new Error('INVALID_OR_EXPIRED_TOKEN');
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
}
