// Runs in a child process with TZ set. It runs the default handler of the task sync-ledger and prints each window as JSON.
// usage: node schedule-window-child.mjs <candidate dir> <cases as JSON>
// A case is { name, zone, time, addAt, until }. The clock starts at addAt and moves in steps of 5 minutes up to until.
// The scheduler runs the handler that src/jobs/index.mjs lists for the task. The window is read from stats.lastWindow of src/jobs/sync-ledger.mjs.
const [dir, casesJson] = process.argv.slice(2);
const STEP_MS = 5 * 60 * 1000;
const { createScheduler } = await import(`${dir}/src/scheduler.mjs`);
const { stats } = await import(`${dir}/src/jobs/sync-ledger.mjs`);

const out = {};
for (const c of JSON.parse(casesJson)) {
  let now = Date.parse(c.addAt);
  const windows = [];
  let error = null;
  try {
    const scheduler = createScheduler({ clock: () => new Date(now) });
    scheduler.add({ id: 'job', time: c.time, zone: c.zone, task: 'sync-ledger' });
    const until = Date.parse(c.until);
    let seen = stats.runs;
    for (now += STEP_MS; now <= until; now += STEP_MS) {
      scheduler.tick();
      if (stats.runs !== seen) {
        windows.push({ ...stats.lastWindow });
        seen = stats.runs;
      }
    }
  } catch (e) {
    error = String(e?.message ?? e);
  }
  out[c.name] = { windows, error };
}
console.log(JSON.stringify(out));
