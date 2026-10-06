// The mean of a sum and a count, as a whole number of hundredths.
export const meanOf = (sum, count) => Math.round(sum / count);

export const sumOf = (readings) => readings.reduce((total, r) => total + r.hundredths, 0);
