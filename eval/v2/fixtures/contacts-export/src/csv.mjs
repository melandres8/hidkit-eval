// rows is a list of objects. columns names the keys to write, in order. The first line is the header.
export function toCsv(rows, columns) {
  const lines = [columns.join(',')];
  for (const row of rows) lines.push(columns.map((c) => String(row[c] ?? '')).join(','));
  return `${lines.join('\n')}\n`;
}
