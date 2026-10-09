import { finalGrade } from '../grades/final.mjs';
import { csvLine } from '../lib/csv.mjs';

// One line per student whose grade is ready.
export function exportGrades({ store }, { term: termId }) {
  const term = store.term(termId);
  const lines = [csvLine(['student', 'name', 'percent', 'letter'])];
  for (const student of term.students) {
    let final;
    try {
      final = finalGrade(term, student);
    } catch (error) {
      if (error.status === 409) continue;
      throw error;
    }
    lines.push(csvLine([student.id, student.name, final.percent, final.letter]));
  }
  return { csv: `${lines.join('\n')}\n` };
}
