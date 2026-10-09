export function dailySummary({ log }, { date }) {
  const entries = log.ofDay(date);
  return { date, opened: entries.filter((e) => e.open).length, refused: entries.filter((e) => !e.open).length };
}
