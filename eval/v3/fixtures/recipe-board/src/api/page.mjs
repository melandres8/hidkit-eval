// The result of a route that returns a page.
export const page = (body, type = 'text/html; charset=utf-8') => ({ status: 200, headers: { 'content-type': type }, body: String(body) });
