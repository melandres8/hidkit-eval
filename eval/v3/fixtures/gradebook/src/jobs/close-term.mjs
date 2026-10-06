import { conflict } from '../http/errors.mjs';
import { finalGrade } from '../grades/final.mjs';

// Stores the final grade of each student, then marks the term closed. A student with a missing category stops the job.
export function closeTerm({ store }, { term: termId }) {
  const term = store.term(termId);
  if (term.closed) throw conflict('the term is already closed');
  const finals = term.students.map((student) => [student, finalGrade(term, student)]);
  for (const [student, final] of finals) student.final = final;
  term.closed = true;
  return { term: term.id, students: finals.length };
}
