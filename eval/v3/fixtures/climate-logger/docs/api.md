# API

Bodies and results are JSON.

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `200` and `{ ok: true }`. |
| POST | `/readings` | `201` and `{ id, sensor, at, hundredths }`. The body has `sensor`, `at` and `value`. See below. |
| GET | `/sensors` | `200` and the list of sensor names that have readings, in order. |
| GET | `/sensors/:id/day?date=YYYY-MM-DD` | `200` and `{ sensor, date, count, mean }`. `400` if the date is not valid. |
| GET | `/sensors/:id/week?from=YYYY-MM-DD` | `200` and `{ sensor, from, count, mean, days }`. `days` has the seven days, each `{ date, count, mean }`. `400` if the date is not valid. |

`sensor` is a non-empty string. `at` is an ISO 8601 date and time. `value` is a string, as `docs/rollups.md` says.

`mean` is a string with two decimals, such as `"21.37"`, or `null` when the period has no readings. `count` is the number of readings.
