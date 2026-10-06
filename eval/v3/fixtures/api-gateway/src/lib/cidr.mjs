// IPv4 helpers. An IPv4 address mapped into IPv6 ("::ffff:10.0.0.1") counts as IPv4.
export function ipToInt(ip) {
  const text = String(ip).replace(/^::ffff:/i, '');
  const parts = text.split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) return null;
  return parts.reduce((acc, p) => acc * 256 + Number(p), 0);
}

export function inCidr(ip, cidr) {
  const [base, bits = '32'] = cidr.split('/');
  const a = ipToInt(ip);
  const b = ipToInt(base);
  if (a === null || b === null) return false;
  const size = 2 ** (32 - Number(bits));
  return Math.floor(a / size) === Math.floor(b / size);
}

export const matchesAny = (ip, list) => list.some((cidr) => inCidr(ip, cidr));
