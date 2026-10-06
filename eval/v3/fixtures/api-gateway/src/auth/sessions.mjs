// sessions is a Map from a token to { userId }.
export function authenticate(request, sessions) {
  const header = request.headers?.authorization ?? '';
  const match = /^Bearer (\S+)$/.exec(header);
  const session = match ? sessions.get(match[1]) : null;
  return session ? { id: session.userId } : null;
}
