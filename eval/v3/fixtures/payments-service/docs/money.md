# Money rules

1. The store, the ledger and the webhooks keep every amount as an integer in minor units.
2. The number of decimals depends on the currency. USD has 2. JPY has 0. KWD has 3. The table is in `src/money/currencies.mjs`.
3. The API takes and returns amounts as decimal strings in major units, with the decimals of the currency. Example: `"12.50"` for USD, `"1250"` for JPY, `"1.250"` for KWD.
4. Convert with `parseAmount` and `formatAmount` from `src/money/format.mjs`. Do not multiply or divide by 100.
5. Add, subtract and compare amounts in minor units only.
6. Do not mix currencies. A payment and the entries about it have the same currency.
7. A payout is the net of a payment: what was captured minus what was refunded. Anything that pays out or totals money uses the net.
