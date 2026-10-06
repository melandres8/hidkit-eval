# Billing rules

All invoices use currencies with 2 decimals.

## Amounts

1. An amount is an integer in minor units (cents). Never use floating-point numbers for money.
2. The unit price is in minor units. The quantity is a whole number.
3. The amount of a line is the quantity times the unit price.
4. The subtotal is the sum of the line amounts.

## Tax

5. The tax rate is in basis points. 825 means 8.25%.
6. Tax is computed once for each invoice, on the subtotal. Do not compute tax for each line.
7. Round the tax to a whole minor unit, with half to even (banker's rounding). A tax of 12.5 cents is 12. A tax of 37.5 cents is 38.
8. The total is the subtotal plus the tax.

## Issued invoices

9. When an invoice is issued, its totals are stored in the file. The stored totals are final.
10. Do not compute again, change or rewrite the totals of an issued invoice. Every output shows the stored totals of an issued invoice. It shows computed totals for a draft.
