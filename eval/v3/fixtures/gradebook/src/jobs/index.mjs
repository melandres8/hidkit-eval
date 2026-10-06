import { closeTerm } from './close-term.mjs';
import { exportGrades } from './export-grades.mjs';

// The job table. A job name maps to a function that takes the app context and options.
export const jobs = {
  'export-grades': exportGrades,
  'close-term': closeTerm,
};
