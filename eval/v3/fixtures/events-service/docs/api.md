# API

| Method | Path | Result |
|---|---|---|
| GET | `/health` | `200`. |
| POST | `/subscriptions` | `201` and the subscription. The body has `url` and an optional list `types`. |
| GET | `/subscriptions` | `200` and a list of subscriptions. |
| DELETE | `/subscriptions/:id` | `204`, or `404`. The service stops the pending retries of this subscription and does not move them to the dead-letter list. |
| POST | `/subscriptions/:id/test` | `200` and the delivery, or `404`. Sends one `ping` event to the subscription now. A ping is a check of the endpoint: the service does not retry it and never moves it to the dead-letter list. |
| POST | `/events` | `201` and the event. The body has `type` and `data`. The service sends the event to each matching subscription. |
| GET | `/events/:id` | `200` and the event, or `404`. |
| GET | `/deliveries/:id` | `200` and the delivery, or `404`. |

A subscription with no `types` receives every event.
