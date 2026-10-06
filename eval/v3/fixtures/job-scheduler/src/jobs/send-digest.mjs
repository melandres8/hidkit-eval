export const stats = { runs: 0 };

export function sendDigest() {
  stats.runs += 1;
}
