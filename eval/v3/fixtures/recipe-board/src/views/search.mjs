// Puts <mark> around the first match of q in text.
function markFirst(text, q) {
  const at = text.toLowerCase().indexOf(q.toLowerCase());
  if (at === -1) return text;
  return `${text.slice(0, at)}<mark>${text.slice(at, at + q.length)}</mark>${text.slice(at + q.length)}`;
}

export function searchView(q, recipes) {
  const items = recipes.map((r) => `<li><a href="/recipes/${r.id}">${markFirst(r.title, q)}</a> by ${r.author}</li>`).join('\n');
  return `<form action="/search"><input name="q" value="${q}"></form>
<h1>Results for ${q}</h1>
${recipes.length ? `<ul class="results">\n${items}\n</ul>` : '<p>No recipe matches.</p>'}`;
}
