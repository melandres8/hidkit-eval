// Number of decimals of each currency (ISO 4217).
export const EXPONENTS = { USD: 2, EUR: 2, GBP: 2, JPY: 0, KRW: 0, KWD: 3, BHD: 3 };

export function exponentOf(currency) {
  const exponent = EXPONENTS[currency];
  if (exponent === undefined) throw new RangeError(`unsupported currency ${currency}`);
  return exponent;
}

export const isSupported = (currency) => Object.hasOwn(EXPONENTS, currency);
