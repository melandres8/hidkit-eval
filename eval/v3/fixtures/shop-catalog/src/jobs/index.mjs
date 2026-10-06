import { exportCatalog } from './export-catalog.mjs';
import { mergeSupplierFeed } from './merge-supplier-feed.mjs';

// The job table. A job name maps to a function that takes the app context and options.
export const jobs = {
  'export-catalog': exportCatalog,
  'merge-supplier-feed': mergeSupplierFeed,
};
