# Scheduler API

| Call | What it does |
|---|---|
| `scheduler.add({ id, time, zone, task })` | Adds a job and plans its first run. `time` is `HH:MM` on a 24 hour clock. `zone` is an IANA name such as `Europe/Berlin`. It throws when the id exists, the time is not valid or the zone is not known. |
| `scheduler.remove(id)` | Removes a job. It returns `true` when the job existed. |
| `scheduler.nextRunAt(id)` | Returns the next planned run of a job as a `Date`, or `null` for an unknown id. |
| `scheduler.list()` | Returns the jobs with their `nextRunAt`. |
| `scheduler.tick()` | Runs each job that is due. A job that is due is run once for each planned run that is not later than the clock. |
