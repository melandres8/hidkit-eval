// Runs in a child process with TZ set. It plays each case against the candidate scheduler and prints the runs as JSON.
// usage: node schedule-child.mjs <candidate dir> <cases as JSON>
// A case is { name, zone, time, addAt, until }. The clock starts at addAt and moves in steps of 5 minutes up to until.
const [dir, casesJson] = process.argv.slice(2);
const STEP_MS = 5 * 60 * 1000;
const { createScheduler } = await import(`${dir}/src/scheduler.mjs`);

const out = {};
for (const c of JSON.parse(casesJson)) {
  let now = Date.parse(c.addAt);
  const runs = [];
  let error = null;
  try {
    const scheduler = createScheduler({ clock: () => new Date(now), onRun: (job, at) => runs.push(new Date(at).toISOString()) });
    scheduler.add({ id: 'job', time: c.time, zone: c.zone });
    const until = Date.parse(c.until);
    for (now += STEP_MS; now <= until; now += STEP_MS) scheduler.tick();
  } catch (e) {
    error = String(e?.message ?? e);
  }
  out[c.name] = { runs, error };
}
console.log(JSON.stringify(out));
