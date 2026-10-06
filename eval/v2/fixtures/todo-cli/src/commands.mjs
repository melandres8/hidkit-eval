// Each command takes the todos and returns the lines to print.
export function list(todos) {
  if (todos.length === 0) return ['No todos.'];
  return todos.map((t) => `${t.done ? '[x]' : '[ ]'} ${t.id}. ${t.title}`);
}

export function add(todos, title) {
  const id = todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  todos.push({ id, title, done: false });
  return [`Added ${id}. ${title}`];
}
