import { categoryTotals } from './categories.mjs';
import { letterFor } from './letters.mjs';

export function finalPercent(term, student) {
  const totals = categoryTotals(term, student);
  const percent = totals.reduce((sum, c) => sum + c.weight * (c.points / c.max), 0);
  return Math.round(percent);
}

// The final grade of a student.
export function finalGrade(term, student) {
  const percent = finalPercent(term, student);
  return { percent, letter: letterFor(percent) };
}
