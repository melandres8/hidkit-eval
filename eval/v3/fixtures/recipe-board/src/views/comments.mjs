export function commentsView(comments) {
  if (comments.length === 0) return '<section class="comments"><p>No comments yet.</p></section>';
  const items = comments.map((c) => `<li><strong>${c.author}</strong>: ${c.text}</li>`).join('\n');
  return `<section class="comments">
<h2>${comments.length} comments</h2>
<ul>
${items}
</ul>
</section>`;
}
