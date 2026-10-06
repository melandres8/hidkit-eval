// Builds the HTTP request for one send of an event to one subscription.
export function buildRequest({ ids }, delivery, event) {
  return {
    url: delivery.url,
    headers: {
      'Content-Type': 'application/json',
      'X-Event-Type': event.type,
      'Idempotency-Key': ids.next('key'),
    },
    body: JSON.stringify({ id: event.id, type: event.type, data: event.data, createdAt: event.createdAt }),
  };
}
