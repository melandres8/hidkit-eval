# Scheduling rules

A job has a `time` and a `zone`. It runs once for each calendar day of its zone, at that local time.

## Rules

- The time zone of the process does not matter. The result is the same for any value of `TZ`. Do not use the local-time methods of `Date`.
- The next run is on the next calendar day of the zone at the local time. It is not 24 hours after the last run.
- When the clocks move forward, some local times do not exist on that day. A job with such a time runs once, at the first valid time after the gap. Example: 02:30 on 2026-03-08 in `America/New_York` runs at 03:00 local time.
- When the clocks move back, some local times happen twice on that day. A job with such a time runs once, at the first of the two times. Example: 01:30 on 2026-11-01 in `America/New_York` runs at the first 01:30.
- A job in `UTC` does not move. It runs at the same UTC time every day.
- The first run of a new job is the next time that the rules give, after the instant of the `add` call.
