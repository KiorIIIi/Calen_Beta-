# Backend Security & Consistency Audit — 2026-11-16

Scope: the server-side surface of Calen — `vite.config.js` (workspace JSON API, SSE, iCal feed, Moodle/Classroom/iCal proxies), `src/firebase.js` (Firestore helpers, Google Calendar REST helpers), `firestore.rules`, and the frontend code that calls these endpoints (`src/app.js`).

This audit records **both** the findings and their dispositions: fixes requested in the same task were applied on `codex/development` and are marked `fixed` with their verification below. Nothing was fixed by relaxing an authorization or privacy check.

## 1. What was executed

| Check | Command | Result |
| :--- | :--- | :--- |
| Syntax lint | `npm run lint` | **pass** (`src/app.js`, `src/firebase.js`) |
| Unit tests | `node --test tests/deadlines.test.js` | **pass** — 2/2, 0 failed, 0 skipped |
| Production build | `npm run build` | **pass** in ~1.7s (pre-existing >500 kB chunk warning only) |
| Runtime smoke: workspace GET | `curl /api/workspace` | 200 |
| Runtime smoke: workspace POST | `curl -X POST /api/workspace` (valid body) | 200, `updatedAt` echoed |
| Runtime smoke: iCal feed | `curl /api/calendar.ics` | 200, valid `BEGIN:VCALENDAR` output |
| Runtime smoke: SSRF block (iCal) | POST `{"url":"http://127.0.0.1:3210/api/calendar.ics"}` | **400** — "points to a private or loopback address" |
| Runtime smoke: SSRF block (Moodle) | POST `{"moodleUrl":"http://192.168.1.10/"}` | **400** — same guard |
| Runtime smoke: scheme block (Moodle) | POST `{"moodleUrl":"ftp://example.com/"}` | **400** — "must use http:// or https://" |
| Runtime smoke: settings guard | POST with `"settings": ["bad"]` | stored as `{}` — no crash, no array persisted |
| Runtime smoke: token gate off | requests without token (default server) | 200 (historical open behavior unchanged) |
| Runtime smoke: token gate on | `CALEN_WORKSPACE_TOKEN=…` server, port 3211 | no token → **401**; wrong token → **401**; `?token=` → **200**; `Authorization: Bearer` → **200**; `/api/calendar.ics?token=` → **200** |

Workspace JSON data was snapshotted before the POST smoke tests and restored afterwards; `data/workspace-db.json` is byte-identical to its pre-audit state apart from the restore.

## 2. Headline result

**11 findings** across severity levels: **9 fixed**, **2 deferred (policy/design)**, plus 6 accepted-risk/observation items. No critical (remote-code-execution / auth-bypass) issues were found. The most serious issue was a server-side request forgery (SSRF) hole in the two import proxies.

## 3. Findings and dispositions

### Fixed

| ID | Severity | Where | Finding | Fix applied | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| F-01 | **High** | `vite.config.js` `/api/proxy/ical`, `/api/proxy/moodle` | **SSRF.** Both proxies fetched any URL the request supplied, including `http://127.0.0.1`, `http://192.168.x.x`, `file:`-scheme tricks via redirects, and cloud-metadata-style loopback targets. Anyone able to reach the dev server (tunnel included) could use it as a bridge into the host machine and LAN. | New `assertPublicHttpUrl()` + `isPrivateHost()`: scheme restricted to http/https; loopback, `*.local`, `*.internal`, RFC1918 (10/8, 172.16/12, 192.168/16), link-local 169.254/16, CGNAT 100.64/10, IPv6 loopback/ULA/link-local all rejected. Escape hatch `CALEN_ALLOW_PRIVATE_UPSTREAMS=true` for genuinely LAN-hosted Moodle instances. | Live smoke tests: loopback and 192.168 targets return 400; non-http scheme returns 400 (table above) |
| F-02 | **Medium** | all `/api/*` endpoints + `src/app.js` | **No authentication on the workspace API.** Anyone with the tunnel URL could read/overwrite `data/workspace-db.json` and consume the proxies. AGENTS.md documents the shared-workspace design, but there was no mechanism at all for a guarded deployment. | Opt-in shared-secret gate: when the server runs with `CALEN_WORKSPACE_TOKEN` set, every `/api/*` request must carry the token (`?token=` or `Authorization: Bearer`). Frontend gained `getWorkspaceToken()`/`apiUrl()` helpers; the token is seeded once from `?token=` in the URL, kept in `sessionStorage`, and attached to all 7 API fetch sites, the `EventSource`, and the exported `.ics` subscription URL. Unset (default) = zero behavior change. | Live smoke tests on a token-enabled instance: 401/401/200/200/200 matrix (table above); all frontend call sites verified by grep (`apiUrl('/api…')` at 8 sites) |
| F-03 | **Medium** | `vite.config.js` all upstream fetches | **Unbounded upstream requests.** Proxy fetches (iCal, Moodle, Classroom) had no timeout; a stalled remote host pinned a connection open on the single-threaded dev/preview server indefinitely. | `AbortSignal.timeout(15000)` on every upstream fetch (iCal, all `callMoodle` calls, both Classroom calls). | Code-verified; behavior of `AbortSignal.timeout` is Node built-in |
| F-04 | **Medium** | `firestore.rules` `moodle_courses` | **Deletes silently impossible.** The single `allow write` rule referenced `request.resource.data.uid`, which is undefined on delete, so every `deleteDoc` on a Moodle course was rejected by the rules — the code path could never actually delete a cloud course. | Split into `allow create, update` (uid required) and `allow delete` (owner + valid ID). | Rule review; the delete path is now exercised by F-05's cleanup |
| F-05 | **Medium** | `src/firebase.js` `saveMoodleCoursesToFirestore` | **Stale course docs never removed.** Syncing only ever batched `set`s; deleting a course locally (including clearing to an empty list) left its Firestore document behind forever, contradicting the repo invariant that empty course lists are meaningful. | Before writing, reads existing course docs via `getDocs` and batch-deletes every cloud doc whose ID is not in the local list. | Code review; delete now permitted by F-04 fix |
| F-06 | **Medium** | `src/firebase.js` `seedWorkspaceToFirestore` | **Firestore 500-write batch cap.** Seeding put every task + course + settings into one batch; >500 items made the commit throw and the whole seed fail. (Pre-existing documented debt — fixed here as part of the requested cleanup.) | Items are committed in chunks of 450. Settings still written separately. | Code review; note trade-off in O-04 |
| F-07 | **Low** | `firestore.rules` `/test/{docId}` | **World-readable test collection** (`allow read: if true`). Used only as a connectivity probe; write was already denied, but anyone (no auth at all) could read anything parked there. | `allow read: if isSignedIn()`. | Rule review; `testConnection()` only runs for signed-in sessions |
| F-08 | **Low** | `firestore.rules` `settings` | **No ownership stamp enforced.** Task and course writes had to carry `uid == path user`, but settings documents could carry any (or no) `uid`, inconsistent with every other write path. | `allow create, update` now requires `request.resource.data.uid == userId`. Both real write paths (`saveSettingsToFirestore`, seeding) already stamp `uid`. | Rule review against both write call sites |
| F-09 | **Low** | `vite.config.js` `readJsonBody` | **Body-parser robustness.** After an over-5 MB reject the stream kept accumulating into the string (memory churn) and the promise could be double-settled; malformed-JSON errors leaked raw parser text into the 400 response. | Settled flag stops accumulation and re-settling; oversized payload is dropped from memory; clear size message. | Code review; oversized payload not exercised live (no public endpoint depends on the distinction) |
| F-10 | **Low** | `vite.config.js` `/api/workspace` POST | **Unvalidated `settings` shape.** Any JSON value (array, string, null) was persisted verbatim into the workspace snapshot. | Non-object settings are replaced with `{}`; arrays rejected. | Live smoke: settings array normalized to `{}` |
| F-11 | **Low** | `src/firebase.js` `handleFirestoreError` | Threw `new Error(JSON.stringify(errInfo))` — machine JSON as a user-facing error message. No consumer parsed the JSON (verified by grep). | Throws the underlying readable message (`errInfo.error`), full diagnostic object still logged to console. | Grep: no consumer parses the thrown message |

### Deferred — policy / design decisions for the owner

| ID | Severity | Where | Finding | Why deferred |
| :--- | :--- | :--- | :--- | :--- |
| D-01 | Info | `vite.config.js` | The workspace API is a **single shared JSON workspace with no per-user identity**. F-02 adds a shared secret, but per-user cloud storage would require an auth design and data model change. | AGENTS.md explicitly documents this as the current design ("do not describe them as per-user cloud storage"). A per-user model is a product decision, not a patch. |
| D-02 | Medium | `vite.config.js` proxies | **Residual SSRF gaps:** (a) a hostname that resolves to a private IP (DNS rebinding) passes the name-based check; (b) upstreams may 30x-redirect to a private target, and `fetch` follows redirects after the initial host check. | Full fix requires resolving DNS per connection (custom undici dispatcher) and `redirect: 'manual'` handling per hop — a non-trivial change with breakage risk for real calendar hosts that redirect. Recommend as follow-up work if the tunnel is exposed beyond trusted users; the F-02 token gate is the practical mitigation meanwhile. |

### Accepted risks / observations (no change made)

| ID | Where | Observation |
| :--- | :--- | :--- |
| O-01 | `vite.config.js` | `server.allowedHosts: true` / `preview.allowedHosts: true` accept any Host header — intentional for the localhost.run tunnel workflow, but it widens DNS-rebinding exposure. Mitigated by F-02 when the token is set. |
| O-02 | `/api/events` | SSE endpoint sets `Access-Control-Allow-Origin: *`. The stream carries only `{type, updatedAt, clientId}` — no workspace content — so impact is negligible. |
| O-03 | Moodle proxy | The Moodle WebService token is sent as a URL query parameter. This is mandated by Moodle's REST API design; it never touches the workspace JSON or Firestore. |
| O-04 | `src/firebase.js` | Seeding is no longer atomic across chunks (chunked commits to respect the 500-write cap). A mid-seed failure can leave a partial seed — acceptable, since a later `onSnapshot` empty-branch re-seed re-runs it. |
| O-05 | `src/app.js` settings | The user-pasted Google Classroom "secret iCal address" is stored in `settings.gcalIcalUrl` (local + cloud). This is the URL Google itself labels as secret; it is the user's own credential handled at their instruction. |
| O-06 | Known debt | Empty-snapshot double-seed race, 2000-line `app.js`, string-based rendering, and the browser-local calendar grid are pre-existing documented debt in AGENTS.md and were intentionally not touched here. |

## 4. Verified sound (checks that passed)

- `firestore.rules` task validation (title 1–400, `dueDate` string ≤ 64, source/status/priority enums, optional `color` enum, `uid` ownership) matches every `saveTaskToFirestore` write shape in `src/app.js` — the app always writes a string `dueDate`, and demo/quick-add/import paths all satisfy the enums.
- `deleteTaskFromFirestore` aligns with the `tasks` delete rule (owner + valid ID); the only `deleteDoc` call site in the codebase.
- `generateIcsFeed` escapes user text (`escapeIcsText`: backslash, `;`, `,`, newlines) before dropping it into ICS properties — no injection into the ICS structure; UIDs use task IDs with `@calen.local` suffix.
- `writeDb` persists via temp file + `renameSync` (atomic-ish on one volume); SSE clients are removed on `close` and broadcast failures.
- Google OAuth access token remains in-memory only (`cachedAccessToken`); it is never persisted to `localStorage`, the workspace JSON, or Firestore, and 401/403 responses clear it.
- localStorage / BroadcastChannel / Firestore layering is unchanged; all smoke-test writes were restored.

## 5. Review boundaries (what was *not* tested)

- Firestore rules were reviewed against code, not executed in a Firebase emulator — no emulator suite exists in this repo.
- The token-gate smoke tests ran with `curl`; the full browser flow (open `?token=` URL → `sessionStorage` seeding → subsequent API calls) is code-reviewed and grep-verified but not end-to-end driven in a real browser.
- SSE reconnection behavior under a token-enabled server was not exercised live.
- No load testing; timeouts and SSRF guards were spot-checked, not stress-tested.
- `data/workspace-db.json` was snapshotted and restored around the POST smoke tests; concurrent-write contention on the temp-file rename was not simulated.

## 6. Follow-ups

1. Resolve D-02 (DNS-per-connection resolution + manual redirect handling in the proxies) if the tunnel will be shared beyond trusted devices.
2. Decide whether `classroomCourses` should get a Firestore home (`/users/{uid}/classroom_courses`) — currently only tasks, Moodle courses, and settings persist to cloud; Classroom data lives in localStorage/workspace JSON only. Per repo conventions this touches rules + `firebase-blueprint.json` + docs, so it was left as a decision rather than patched in.
3. When Google login is re-enabled, re-run this audit against the enabled auth paths (`GOOGLE_LOGIN_ENABLED = true`).
