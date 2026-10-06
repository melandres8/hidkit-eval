# Readings and rollups

## Values

A value is a whole number of hundredths of a degree. The reading `21.37` is stored as `2137`. The service never keeps a temperature as a fraction.

The text of a value is an optional `-`, one or more digits, and then, optionally, a `.` with one or two digits. `21`, `-0.07` and `19.5` are valid. A text with more than two decimals is not valid and gets `400`.

## Means

A mean of a period is the sum of all the readings of the period divided by their count. The sum and the count come from the raw readings, or from sums and counts that were added together. A mean of means is not a mean of the period.

The service rounds a mean once, at the end, to the nearest hundredth. A tie goes away from zero: `-0.015` becomes `-0.02` and `0.015` becomes `0.02`.

## Periods

A day is a UTC day. A week is seven UTC days from a given day. Every number that the service reports for a day or a week follows the rules above, in a route or in a job.
