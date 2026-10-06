# Grading

## Scores and categories

- A score is a whole number of points out of a whole maximum, in one category of the term.
- A teacher marks a score as excused (`excused: true`) when the student could not do the work for a good reason. An excused score counts in neither the points nor the maximum of its category. It is not a zero.
- Each category has a weight. The weights of a term sum to 100.
- The percent of a category is the sum of the points over the sum of the maximums of its scores that count, times 100.

## Categories that do not count

- When every score of a student in a category is excused, that category does not count in the final grade of the student.
- When a student has no score yet in a category, the grade of the student is not ready. The grade route and the report card answer `409`, and the export leaves the student out.

## The final grade

- The final percent is the sum, over the categories that count, of the weight of the category times the percent of the category, over the sum of the weights of those categories. When every category counts, the sum of the weights is 100.
- Round the final percent to a whole percent. A half goes up: 89.5 gives 90.
- The letter comes from the rounded final percent: `A` from 90, `B` from 80, `C` from 70, `D` from 60, and `F` below 60.
- Every output that shows a final grade shows the same percent and letter, in a route or in a job.
