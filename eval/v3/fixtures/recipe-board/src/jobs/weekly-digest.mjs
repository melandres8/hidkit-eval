import { composeDigest } from '../mail/compose.mjs';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function weeklyDigest({ clock, mailer, recipes }, { to } = {}) {
  if (typeof to !== 'string' || to === '') throw new Error('to is required');
  const fresh = recipes.since(new Date(clock().getTime() - WEEK_MS).toISOString());
  if (fresh.length === 0) return { sent: 0, recipes: 0 };
  mailer.send({ to, subject: 'New on the recipe board', html: composeDigest(fresh) });
  return { sent: 1, recipes: fresh.length };
}
