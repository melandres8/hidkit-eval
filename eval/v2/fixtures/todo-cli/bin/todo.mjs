#!/usr/bin/env node
import { add, list } from '../src/commands.mjs';
import { load, save } from '../src/store.mjs';

const file = process.env.TODO_FILE ?? 'todos.json';
const [command, ...rest] = process.argv.slice(2);

let lines;
if (command === 'list') {
  lines = list(load(file));
} else if (command === 'add' && rest.length) {
  const todos = load(file);
  lines = add(todos, rest.join(' '));
  save(file, todos);
} else {
  console.error('usage: todo list | todo add <title>');
  process.exit(2);
}
for (const line of lines) console.log(line);
