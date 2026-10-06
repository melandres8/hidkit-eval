# Webhook delivery contract

The service sends each event to every matching subscription. One send of one event to one subscription is a delivery.

## Request

- The method is POST. The body is the JSON of the event.
- Header `Content-Type` is `application/json`. Header `X-Event-Type` is the event type.
- Header `Idempotency-Key` identifies the delivery. The key is the same on every attempt of one delivery. Two deliveries never share a key. The receiver uses it to ignore a repeat.

## Attempts

- The first attempt runs when the event is posted.
- A delivery has at most 5 attempts, the first one included.
- After a failed attempt, the service waits before the next one. The wait is 1 second after attempt 1, then 2 s, 4 s and 8 s. The wait starts when the failed attempt ends.
- The service has no timers. The job `retry-deliveries` sends each delivery that is due. The scheduler runs it every second.

## What counts as a failure

- A status 2xx is a success.
- A status 5xx, a status 429 and a network error are failures that the service retries.
- Any other status is a permanent failure. The service does not retry. This includes the other 4xx statuses.

## Dead letters

- After the fifth failed attempt, the service stops and moves the delivery to the dead-letter list.
- `GET /dead-letters` returns the list. Each item has `deliveryId`, `eventId`, `url` and `attempts`.
- A permanent failure does not go to the dead-letter list. A delivery that succeeded never goes there.
