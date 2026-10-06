const DAY_MS = 24 * 60 * 60 * 1000;

// Sends each user the names of the people who joined in the last 24 hours.
export function runDigest({ store, mailer, clock }) {
  const since = clock().getTime() - DAY_MS;
  const users = store.all();
  const newcomers = users.filter((user) => Date.parse(user.createdAt) > since);
  if (newcomers.length === 0) return { sent: 0 };
  const text = newcomers.map((user) => user.name).join('\n');
  for (const user of users) mailer.send({ to: user.email, subject: 'New members', text });
  return { sent: users.length };
}
