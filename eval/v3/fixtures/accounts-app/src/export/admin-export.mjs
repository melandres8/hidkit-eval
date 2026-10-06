// The admin team downloads this list. It holds the contact fields of each user.
export function exportUsers(store) {
  return store.all().map(({ id, name, email, handle, createdAt }) => ({ id, name, email, handle, createdAt }));
}
