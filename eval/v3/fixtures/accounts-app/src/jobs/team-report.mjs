// Mails the support team the size of the user base and the handles on it.
export function runTeamReport({ store, mailer }) {
  const users = store.all();
  const text = `${users.length} users\n${users.map((user) => user.handle).join('\n')}`;
  mailer.send({ to: 'support@example.test', subject: 'Team report', text });
  return { users: users.length };
}
