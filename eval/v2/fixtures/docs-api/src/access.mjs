export function canAccess(doc, user) {
  return doc.ownerId === user;
}
