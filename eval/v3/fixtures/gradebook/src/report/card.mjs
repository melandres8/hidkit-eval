import { categoryTotals } from '../grades/categories.mjs';
import { letterFor } from '../grades/letters.mjs';

// The text of a report card.
export function reportCard(term, student) {
  const totals = categoryTotals(term, student);
  const lines = [`Report card ${term.id}`, `Student: ${student.name}`];
  let sum = 0;
  for (const c of totals) {
    const percent = Math.round((100 * c.points) / c.max);
    lines.push(`${c.name}: ${percent}%`);
    sum += c.weight * percent;
  }
  const final = term.closed ? student.final : { percent: Math.round(sum / 100), letter: letterFor(Math.round(sum / 100)) };
  lines.push(`Final: ${final.percent}% (${final.letter})`);
  return `${lines.join('\n')}\n`;
}
