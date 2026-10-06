// The key of the caller. The limiters, the blocklist and the audit log use it.
export function clientKey(request) {
  return request.remoteAddress;
}
