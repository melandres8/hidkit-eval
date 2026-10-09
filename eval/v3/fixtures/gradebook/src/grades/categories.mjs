import { conflict } from '../http/errors.mjs';

// The points and the maximum of each category of a term, for one student.
export function categoryTotals(term, student) {
  return term.categories.map(({ name, weight }) => {
    const scores = student.scores.filter((s) => s.category === name);
    if (scores.length === 0) throw conflict(`no score yet in ${name}`);
    const points = scores.reduce((sum, s) => sum + s.points, 0);
    const max = scores.reduce((sum, s) => sum + s.max, 0);
    return { name, weight, points, max };
  });
}
