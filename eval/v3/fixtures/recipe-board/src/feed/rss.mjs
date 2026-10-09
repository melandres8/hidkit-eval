const SITE = 'https://recipes.example.test';

function item(recipe) {
  return `<item>
<title>${recipe.title}</title>
<link>${SITE}/recipes/${recipe.id}</link>
<guid>${SITE}/recipes/${recipe.id}</guid>
<pubDate>${new Date(recipe.createdAt).toUTCString()}</pubDate>
<dc:creator>${recipe.author}</dc:creator>
<description>A recipe with ${recipe.ingredients.length} ingredients.</description>
${recipe.tags.map((t) => `<category>${t}</category>`).join('\n')}
</item>`;
}

// RSS 2.0, newest first.
export function rss(recipes) {
  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>Recipe board</title>
<link>${SITE}/</link>
<description>New recipes of the club</description>
${recipes.map(item).join('\n')}
</channel>
</rss>`;
}
