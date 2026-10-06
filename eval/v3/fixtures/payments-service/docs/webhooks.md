# Webhooks

The service sends an event through the transport each time a payment changes state.

An event has `id`, `type`, `createdAt` and `data`. The `data` field holds the payment, built by `paymentPayload` in `src/webhooks/payloads.mjs`.

| Type | When |
|---|---|
| `payment.captured` | A payment is captured. |

A change of an amount, such as a capture, also sends an event.

Webhook amounts are integers in minor units. They are not decimal strings.
