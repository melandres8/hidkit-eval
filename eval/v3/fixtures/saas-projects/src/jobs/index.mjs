import { exportProjects } from './export-projects.mjs';

// The job table. A job name maps to a function that takes the app context and options.
export const jobs = {
  'export-projects': exportProjects,
};
