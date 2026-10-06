import { notFound } from '../http/errors.mjs';

// Recipes in memory, in the order they were posted.
export function createRecipeStore({ clock }) {
  const recipes = [];
  let next = 1;
  return {
    add({ title, author, ingredients, steps, tags }) {
      const recipe = { id: `r${next++}`, title, author, ingredients, steps, tags, createdAt: clock().toISOString(), comments: [] };
      recipes.push(recipe);
      return recipe;
    },
    get(id) {
      const recipe = recipes.find((r) => r.id === id);
      if (!recipe) throw notFound();
      return recipe;
    },
    addComment(id, { author, text }) {
      const comment = { author, text, at: clock().toISOString() };
      this.get(id).comments.push(comment);
      return comment;
    },
    all: () => [...recipes],
    newest: (count) => [...recipes].reverse().slice(0, count),
    since: (iso) => recipes.filter((r) => r.createdAt >= iso),
  };
}
