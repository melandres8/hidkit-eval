// The body of the weekly email.
function entry(recipe) {
  const latest = recipe.comments.at(-1);
  return `<tr>
<td><a href="https://recipes.example.test/recipes/${recipe.id}">${recipe.title}</a></td>
<td>${recipe.author}</td>
<td>${recipe.tags.join(', ')}</td>
<td>${latest ? `${latest.author}: ${latest.text}` : ''}</td>
</tr>`;
}

export function composeDigest(recipes) {
  return `<html><body>
<h1>New on the recipe board</h1>
<table>
<tr><th>Recipe</th><th>By</th><th>Tags</th><th>Newest comment</th></tr>
${recipes.map(entry).join('\n')}
</table>
</body></html>`;
}
