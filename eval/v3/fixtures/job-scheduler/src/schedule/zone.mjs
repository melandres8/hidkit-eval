const formatters = new Map();

function formatter(zone) {
  if (!formatters.has(zone)) {
    formatters.set(zone, new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    }));
  }
  return formatters.get(zone);
}

export function isKnownZone(zone) {
  try {
    formatter(zone);
    return true;
  } catch {
    return false;
  }
}

// The calendar fields of an instant on the wall clock of a zone.
export function localParts(instantMs, zone) {
  const parts = Object.fromEntries(formatter(zone).formatToParts(new Date(instantMs)).map((p) => [p.type, Number(p.value)]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
}

// The offset of a zone from UTC at an instant, in milliseconds. East of UTC is positive.
export function offsetAt(instantMs, zone) {
  const p = localParts(instantMs, zone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instantMs / 1000) * 1000;
}
