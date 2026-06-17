import { env } from '../config/env.js';

export function isAdminEmail(email: string) {
  return env.ADMIN_EMAILS.includes(email.toLowerCase());
}
