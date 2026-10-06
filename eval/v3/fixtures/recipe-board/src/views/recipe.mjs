import { commentsView } from './comments.mjs';

const paragraphs = (steps) => steps.split(/\n{2,}/).filter(Boolean).map((p) => `<p>${p}</p>`).join('\n');
const tagLinks = (tags) => tags.map((t) => `<a class="tag" href="/tags/${encodeURIComponent(t)}">${t}</a>`).join(' ');

export function recipeView(recipe) {
  return `<article class="recipe">
<h1>${recipe.title}</h1>
<p class="byline">By ${recipe.author}</p>
<ul class="ingredients">
${recipe.ingredients.map((line) => `<li>${line}</li>`).join('\n')}
</ul>
<section class="steps">
${paragraphs(recipe.steps)}
</section>
<p class="tags">${tagLinks(recipe.tags)}</p>
${commentsView(recipe.comments)}
</article>`;
}
