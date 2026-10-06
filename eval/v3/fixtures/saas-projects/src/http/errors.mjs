export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const unauthorized = (message = 'unauthorized') => new HttpError(401, message);
export const notFound = (message = 'not found') => new HttpError(404, message);
