// A CSV field. A text that a spreadsheet would read as a formula gets a leading quote.
export function csvField(value) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const csvLine = (values) => values.map(csvField).join(',');
