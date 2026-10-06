# Fields of a talk

| Field | Who sets it |
|---|---|
| `title`, `abstract`, `track`, `level` | The speaker. These are the speaker fields. |
| `status`, `score`, `room` | An organizer. |
| `id`, `speakerId`, `createdAt`, `updatedAt` | The service. |

## Rules

- A write that a speaker starts takes only the speaker fields from the request, through `pickSpeakerFields` in `src/talks/fields.mjs`. This holds for every write that a speaker starts, in a route or in a job.
- A field that the speaker may not set does not change the talk. The service may ignore it, or refuse the request with `400` and change nothing.
- A new talk starts with `status: "submitted"`, `score: null` and `room: null`, and it belongs to the speaker who sent it.
- Organizers set `status` and `score` with the review route, and `room` with the job `assign-rooms`. These writes keep working for organizers.
