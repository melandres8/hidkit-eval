# Rate limits

A limiter counts the requests of one key in a fixed window. When the count passes `max`, the limiter refuses requests until the window ends. The window starts at the first request.

A key names one caller. A caller is a signed-in user, or an anonymous client at an address.

The limits are in `config/gateway.json`.

| Limiter | Route | Needs a user |
|---|---|---|
| `login` | `POST /login` | No |
| `upload` | `POST /uploads` | Yes |
