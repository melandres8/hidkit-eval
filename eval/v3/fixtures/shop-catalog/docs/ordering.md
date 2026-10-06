# Ordering

The service sorts text in two ways. Use the one that fits the reader.

## Display order

Display order is for what a person reads: a product list, a menu of categories, search results, and a file that a person opens in a spreadsheet.

- Case does not matter: `apple press` comes before `Zinc mug`.
- An accent does not matter: `Éclair tin` sorts as `Eclair tin`.
- A number inside the text counts by its value: `Item 2` comes before `Item 10`.

## Stored order

Stored order is for what a program reads. It is the code-point order of the text, and a SKU is a different SKU when only the case differs.

A list in stored order must be read in stored order. See `docs/architecture.md` and `docs/jobs.md` for the lists that the service keeps in this order.
