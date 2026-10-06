import { categoryTotals } from './categories.mjs';
import { letterFor } from './letters.mjs';

export function finalPercent(term, student) {
  const totals = categoryTotals(term, student);
  const percent = totals.reduce((sum, c) => sum + (c.weight / 100) * (c.points / c.max) * 100, 0);
  return Math.round(percent);
}

// The final grade of a student. A closed term keeps its stored grade.
export function finalGrade(term, student) {
  if (term.closed) return student.final;
  const percent = finalPercent(term, student);
  return { percent, letter: letterFor(percent) };
}
