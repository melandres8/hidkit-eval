# Output

Text that a person types (a recipe, a comment, a search) is data. The service shows it as text. It never becomes markup.

## Rules

- Store a text as the person typed it. The JSON API returns it as typed.
- Escape a text when it goes into an output, for the format of that output. For HTML and XML, build the markup with the `html` tag of `src/lib/html.mjs`, which escapes each value, or pass the text through `escapeHtml`. This holds for every output that a browser or a reader program reads as markup, in a route or in a job.
- Escape a text once. A text that holds `&`, `<`, `>`, quotes or accents shows exactly as the person typed it.
- Markup that the service makes, such as a link, stays markup.
