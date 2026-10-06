# Proxies

Requests reach the gateway through load balancers. The list `trustedProxies` in `config/gateway.json` names them. An entry is an IPv4 address or a CIDR range.

Each trusted proxy adds the address of its caller to the end of the header `x-forwarded-for`. The header holds addresses from the client to the last proxy.

Rules:

1. Trust `x-forwarded-for` only when the connection comes from a trusted proxy. From any other address, ignore the header.
2. Read the header from the right. Skip the addresses of trusted proxies. The first other address is the client.
3. A client can write anything at the left of the list. Do not trust the left side.
