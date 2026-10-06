// Text that starts like a formula gets a leading quote, so a spreadsheet shows it as text.
const cell = (value) => {
  let text = String(value ?? '');
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = (header, rows) => [header, ...rows].map((row) => row.map(cell).join(',')).join('\n') + '\n';
