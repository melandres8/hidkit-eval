// Escaping for HTML and XML. See docs/output.md.
const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ENTITIES[c]);

// Markup that is already safe. html`...` returns one, so a view can put one fragment into another.
class Markup {
  constructor(text) {
    this.text = text;
  }

  toString() {
    return this.text;
  }
}

export const raw = (text) => new Markup(String(text));

const render = (value) => {
  if (value instanceof Markup) return value.text;
  if (Array.isArray(value)) return value.map(render).join('');
  if (value === null || value === undefined) return '';
  return escapeHtml(value);
};

// A tag for template strings: html`<p>${text}</p>` escapes text. A Markup value or a list of them goes in as it is.
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => {
    out += render(value) + strings[i + 1];
  });
  return new Markup(out);
}
