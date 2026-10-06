# Architecture

The scheduler has no timers. The app calls `scheduler.tick()` often, for example each minute. A tick runs each job that is due.

`createScheduler({ clock, onRun })`:

- `clock()` returns the current `Date`. Tests pass their own clock.
- `onRun(job, scheduledAt)` is called once for each run. `scheduledAt` is a `Date`, the instant the run was planned for. The default `onRun` calls the handler named by `job.task` in `src/jobs/index.mjs`.

All instants are milliseconds since the epoch inside the scheduler.
