import { categoryTotals } from '../grades/categories.mjs';
import { finalGrade } from '../grades/final.mjs';

// The text of a report card.
export function reportCard(term, student) {
  const lines = [`Report card ${term.id}`, `Student: ${student.name}`];
  for (const c of categoryTotals(term, student)) lines.push(`${c.name}: ${Math.round((100 * c.points) / c.max)}%`);
  const final = finalGrade(term, student);
  lines.push(`Final: ${final.percent}% (${final.letter})`);
  return `${lines.join('\n')}\n`;
}
