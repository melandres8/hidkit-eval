import { badRequest } from '../http/errors.mjs';

// Hosts that a subscription must not name: local names, and IP literals in loopback, private or link-local ranges.
function isPrivateHost(host) {
  const name = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (name === 'localhost' || /\.(localhost|local|internal)$/.test(name)) return true;
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(name);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (name.includes(':')) return name === '::1' || name === '::' || /^f[cd]/.test(name) || /^fe[89ab]/.test(name) || name.startsWith('::ffff:');
  return false;
}

export function requireUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw badRequest('url is not valid');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw badRequest('url must use http or https');
  if (url.username || url.password) throw badRequest('url must not hold credentials');
  if (isPrivateHost(url.hostname)) throw badRequest('url must name a public host');
  return url.href;
}

export function requireString(value, name) {
  if (typeof value !== 'string' || value === '') throw badRequest(`${name} is required`);
  return value;
}
