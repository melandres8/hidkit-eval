import { html } from '../lib/html.mjs';

export function tagView(name, recipes) {
  const items = recipes.map((r) => html`<li><a href="/recipes/${r.id}">${r.title}</a> by ${r.author}</li>`);
  return html`<h1>Recipes tagged ${name}</h1>
${recipes.length ? html`<ul class="results">${items}</ul>` : html`<p>No recipe has this tag.</p>`}`;
}
