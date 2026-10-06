import { categoryTotals } from '../grades/categories.mjs';
import { letterFor } from '../grades/letters.mjs';
import { csvLine } from '../lib/csv.mjs';

// One line per student whose categories all have a score.
export function exportGrades({ store }, { term: termId }) {
  const term = store.term(termId);
  const lines = [csvLine(['student', 'name', 'percent', 'letter'])];
  for (const student of term.students) {
    let final = student.final;
    if (!term.closed) {
      let totals;
      try {
        totals = categoryTotals(term, student);
      } catch (error) {
        if (error.status === 409) continue;
        throw error;
      }
      const percent = Math.round(totals.reduce((sum, c) => sum + c.weight * ((100 * c.points) / c.max), 0) / 100);
      final = { percent, letter: letterFor(percent) };
    }
    lines.push(csvLine([student.id, student.name, final.percent, final.letter]));
  }
  return { csv: `${lines.join('\n')}\n` };
}
