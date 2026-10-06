import { notFound } from '../http/errors.mjs';

// The terms in memory. The store keeps its own copy of the data that it gets.
export function createTermStore(terms = []) {
  const data = structuredClone(terms);
  return {
    term(id) {
      const term = data.find((t) => t.id === id);
      if (!term) throw notFound('no such term');
      return term;
    },
    student(term, id) {
      const student = term.students.find((s) => s.id === id);
      if (!student) throw notFound('no such student');
      return student;
    },
  };
}
