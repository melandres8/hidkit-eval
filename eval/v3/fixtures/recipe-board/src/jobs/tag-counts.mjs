export function tagCounts({ recipes }) {
  const counts = {};
  for (const recipe of recipes.all()) {
    for (const t of recipe.tags) counts[t] = (counts[t] ?? 0) + 1;
  }
  return { counts };
}
