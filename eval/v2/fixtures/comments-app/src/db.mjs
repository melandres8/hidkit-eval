// In-memory database. Each read returns a copy, like a row from a real database.
export function createDb() {
  const users = new Map();
  const comments = [];
  return {
    addUser(user) {
      users.set(user.id, { ...user });
    },
    getUser(id) {
      const user = users.get(id);
      return user ? { ...user } : null;
    },
    setUserName(id, name) {
      const user = users.get(id);
      if (!user) throw new RangeError(`no user ${id}`);
      users.set(id, { ...user, name });
    },
    addComment(comment) {
      comments.push({ ...comment, id: comments.length + 1 });
    },
    listComments(postId) {
      return comments.filter((c) => c.postId === postId).map((c) => ({ ...c }));
    },
  };
}
