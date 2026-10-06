# Jobs

A job is a function. It takes the app context and an options object. The table in `src/jobs/index.mjs` maps a job name to its function.

Run a job with `app.runJob(name, options)`. It returns the result of the job.

| Name | What it does |
|---|---|
| `export-grades` | Options `{ term }`. It returns `{ csv }`: the header `student,name,percent,letter`, then one line per student, in the order of the term. A student with a category that has no score yet is left out. |
| `close-term` | Options `{ term }`. It stores the final grade of each student and marks the term closed. It returns `{ term, students }`, the number of grades stored. A closed term cannot close again (`409`). |
