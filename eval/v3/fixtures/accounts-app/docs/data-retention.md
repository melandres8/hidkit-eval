# Data retention

A deleted user stays on disk for 30 days. Support can restore the user in that time. After 30 days the record is removed.

## Records

- An active user has `status: "active"`.
- A deleted user has `status: "deleted"` and `deletedAt`, an ISO 8601 time.
- Old records have no `status` field. They are active users. Do not rewrite them to add the field.

## Handles

The handle of a deleted user stays reserved for the 30 days, because a restore must give the same handle back. A new user cannot take it. After the purge the handle is free again.

## Support tools

- Support restores a user with `POST /admin/users/:id/restore`.
- The job `purge-deleted` removes the record of each user who was deleted more than 30 days ago. It runs each night.

## Rule for the product

A deleted user must not show in the product, and must not count in any number the product reports. Support is the only team that can see a deleted record.
