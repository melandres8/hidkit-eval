# Storage

The vault keeps its data in one folder, `root`. The service makes these folders in `root` when it starts:

| Folder | Content |
|---|---|
| `files/` | The files of the people. A file name is a path relative to this folder, so `reports/2026/q1.txt` is a valid name. |
| `previews/` | One cached preview for each file that someone previewed. |
| `bundles/` | The bundles that the job `build-bundle` made. |

Other folders may sit next to these in `root`. The service does not read or write them.

A file holds text. The service refuses a file of more than 1 000 000 bytes.
