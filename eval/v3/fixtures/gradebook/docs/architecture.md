# Architecture

The service has no server. `createApp({ terms, clock })` returns an object with a `handle(request)` function and a `runJob(name, options)` function. `clock` returns the current `Date`.

A request has a `method`, a `path` and an optional `body`. The layer in front of the app checks that the caller is a teacher of the course.

A term has an `id`, a list of `categories` (`name`, `weight`) and a list of `students` (`id`, `name`, `scores`). A score is `{ category, points, max }`, with `excused: true` when it is excused.

| Part | Folder | Job |
|---|---|---|
| Routes | `src/api/` | Map a route to the store, the grade rules or a job. |
| Store | `src/store/` | Keep the terms in memory. |
| Grades | `src/grades/` | Category totals, the final percent and the letter. |
| Report | `src/report/` | Make the text of a report card. |
| Jobs | `src/jobs/` | Work on a whole term. |
