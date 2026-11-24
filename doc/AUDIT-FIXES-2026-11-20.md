# Audit & Fix Record — 2026-11-20

Scope: full read of `src/app.js`, `src/firebase.js`, `src/deadlines.js`, `vite.config.js`, `src/api.js`, `firestore.rules`, `index.html` (task form), and the existing audits. This record covers **both** the findings and their dispositions — fixes were requested in the same task. Follows `SECURITY-AUDIT-2026-11-16.md`; its deferred item **D-02b (SSRF via upstream redirects)** is closed here. Nothing was fixed by relaxing an authorization or privacy check.

The working tree carried uncommitted sign-in work (`src/auth/`, `doc/AUTH.md`, related docs/tests). It was left untouched; no commits were made.

## 1. What was executed

| Check | Command | Result |
| :--- | :--- | :--- |
| Baseline tests (before edits) | `node --test tests/deadlines.test.js tests/auth.test.js` | **pass** — 14/14 |
| Syntax lint | `npm run lint` | **pass** |
| Syntax check (all touched files) | `node --check` on `app.js`, `firebase.js`, `deadlines.js`, `ical-utils.js`, `vite.config.js` | **pass** (5/5) |
| Full unit suite (after edits) | `node --test tests/deadlines.test.js tests/auth.test.js tests/ical-utils.test.js tests/server-security.test.js` | **pass** — 36/36, 0 skipped |
| Production build | `npm run build` | **pass** in ~2.6s (pre-existing >500 kB chunk warning only) |
| Runtime smoke (workspace/ICS/SSRF/SSE) | `bash smoke.sh` against dev server on scratch port 3210 | **pass** — readiness 200; workspace GET/POST roundtrip persisted; `calendar.ics` 4 VEVENTs, max line 62 octets (≤75); loopback, IPv4-mapped IPv6, and RFC1918 targets all **400**; SSE `connected` frame received. Live redirect-to-loopback probe **inconclusive** (httpbin.org unreachable from this host — first-hop `fetch failed`); redirect logic covered by mocked unit tests. `data/workspace-db.json` backed up before the POST and **restored byte-identical** (1579 bytes) afterwards. |
| Browser UI flows | — | **NOT RUN** (see boundaries) |

Node invocation note: in this repo's bash, `node` may be aliased to `winpty node.exe` (fails with "stdin is not a tty" non-interactively) — use `command node`. `node --test tests/` (bare directory) does not resolve on Node 26; pass explicit test files.

## 2. Headline result

**12 findings fixed**, 5 deferred (policy/design or pre-existing documented debt), plus the prior audit's D-02b closed. No critical issues found. The recurring theme: **undated/invalid `dueDate` values** poisoning sorts, banners, exports, and the task editor, and **cloud writes persisting raw upstream objects instead of the merged local task**, silently resetting user edits via the Firestore snapshot listener.

## 3. Findings and dispositions

### Fixed

| ID | Severity | Where | Finding | Fix applied | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| N-01 | Medium | `app.js` `sortTasks`, `renderReminderBanner` | `new Date(a.dueDate) - new Date(b.dueDate)` yields `NaN` for missing/invalid dates → unstable sort order; an undated task could hijack the "Next Deadline" banner (showing "No deadline"). | New pure `dueSortKey()` in `deadlines.js` (epoch ms, `Infinity` for missing/invalid); both sort sites use it; banner only considers dated pending tasks. | Unit tests (`dueSortKey` ordering + Infinity cases) |
| N-02 | Medium | `app.js` `openTaskModal` + `form-task` submit, `index.html` | Editing an undated task left the **previous task's date/time pre-filled** — saving silently assigned a deadline the user never set. Empty date would also throw `RangeError` in `toISOString()` (masked only by the native `required` attribute). | Date/time fields cleared for undated tasks; due date is now optional (`required` removed); empty date saves `dueDate: ''` (rules accept empty string; grouping already supports "No date"); invalid date guarded. | Code review vs `firestore.rules` (`dueDate is string ≤ 64`); grouping tests pre-cover undated tasks. UI flow not browser-tested (boundary). |
| N-03 | Medium | `app.js` `applyMoodleCourseSync` | (a) Firestore loop wrote the **raw upstream assignment templates**, not the merged tasks — cloud copy reset user status/color, and the next `onTasks` snapshot propagated that reset back to local. (b) Tasks removed by un-syncing a course were **never deleted from Firestore** → resurrected on next sign-in. | Writes `mergedMap.get(t.id)` (local edits win, per DATA-MODEL §5.2); computes `removedTasks` and calls `deleteTaskFromFirestore` for each. | Code review against snapshot flow + delete rule (owner + valid ID). No emulator (boundary). |
| N-04 | Medium | `app.js` pasted-iCal import (`btn-parse-ical`) | Same class as N-03a: cloud writes used the raw import objects (`status: 'todo'`) instead of the merged tasks that `mergeImportedTasks` updated in place. | Writes the merged task looked up from `state.tasks` by id. | Code review |
| N-05 | Medium | `app.js` `handleGcalBulkExportPrompt`, `firebase.js` `upsertGoogleCalendarEvent` | Bulk push included undated tasks → `toISOString()` on Invalid Date threw mid-loop, aborting all remaining pushes with a raw `RangeError`. | Bulk list filtered to dated tasks (confirm dialog reports skipped count); `upsertGoogleCalendarEvent` throws a clear "no valid deadline" error (also covers single-task push). | Code review; guard is a pure date check |
| N-06 | Medium | `vite.config.js` `/api/proxy/ical`, `/api/proxy/moodle` | **SSRF via redirect (prior audit D-02b):** initial URL passed the public-host check, then `fetch` silently followed 30x redirects into loopback/LAN targets. | New `fetchPublicUpstream()`: `redirect: 'manual'`, every hop re-validated by `assertPublicHttpUrl`, relative `Location` resolved against the current hop, 5-hop cap, 15 s timeout preserved. Applied to both user-URL proxies (Classroom/tokeninfo use fixed Google URLs). | 4 unit tests with mocked `fetch` (private-hop block, public chain + relative Location, hop cap, missing Location). Live public-redirector probe inconclusive (httpbin unreachable); direct loopback/mapped-IPv6 blocks verified live (§1). |
| N-07 | Medium | `vite.config.js` `isPrivateHost` | **IPv4-mapped IPv6 bypass:** `http://[::ffff:127.0.0.1]/` (and hex form `::ffff:7f00:1`) passed the guard — neither the IPv6 nor the IPv4 checks matched. | Embedded IPv4 extracted (dotted or hex form) and re-run through the private-range checks. | Unit tests: 7 mapped-private variants blocked; public mapped (`::ffff:8.8.8.8`) still allowed |
| N-08 | Low | `parseIcsEvents` (now `src/ical-utils.js`) | `STATUS:CANCELLED` tombstones (Google/Moodle feeds keep them) were imported as live tasks; the REST import path already skipped cancelled events. | Parser skips CANCELLED blocks. | Unit test |
| N-09 | Low | ICS generation (server + client) | Server feed emitted unfolded lines (RFC 5545 §3.1 75-octet limit) — strict parsers can reject long SUMMARY/DESCRIPTION. Client download **duplicated** the generator with divergent, lossy escaping (stripped `,;\`) and leaked object URLs. | New shared pure module `src/ical-utils.js`: `escapeIcsText`, `formatIcsDate`, `foldIcsLine` (UTF-8-octet-aware, never splits code points), one `generateIcsFeed` used by both the server route and the client download; object URL revoked after download. | Unit tests: octet limit on every line, multibyte folding, unfold round-trip, escaping, generator/parser round-trip |
| N-10 | Low | `vite.config.js` `/api/events` | No SSE heartbeat — tunnel/proxy idle timeouts drop the stream (EventSource reconnects, but `serverOnline` flickers and updates lag). | 25 s `: ping` comment frame per client, `unref()`'d, cleared on close/write failure. | Code review; SSE `connected` frame verified live (25 s heartbeat interval itself not observed — test window was 3 s) |
| N-11 | Low | `vite.config.js` `readJsonBody` | A client aborting mid-upload never settled the promise (`end`/`error` might not fire) → handler hung. | `req.on('close')` fails the promise unless already settled (no-op on normal completion). | Code review |
| N-12 | Low | `app.js` `escapeHtml` | Single quotes not escaped — safe today (all interpolations use double-quoted attributes) but one future single-quoted attribute away from XSS. | Added `'` → `&#39;`. | Code review |

### Deferred — policy / design / pre-existing debt

| ID | Where | Finding | Why deferred |
| :--- | :--- | :--- | :--- |
| D-02a | `vite.config.js` proxies | DNS-rebinding: a public hostname resolving to a private IP still passes the name-based check (prior audit). | Needs resolve-per-connection (custom undici dispatcher); breakage risk. Token gate (`CALEN_WORKSPACE_TOKEN`) remains the practical mitigation. |
| D-03 | `app.js` `applyClassroomCourseSync` | Classroom sync is **local-only** — no Firestore writes at all, so a cloud snapshot can overwrite it; asymmetric with Moodle. | Tied to the prior audit's follow-up 2: giving `classroomCourses` a Firestore home touches rules + blueprint + docs — a product decision, not a patch. |
| D-04 | `vite.config.js` Classroom proxy; `parseIcsEvents` | Undated coursework gets a fabricated `now + 3 days` deadline; dateless VEVENTs get `now + 2 days`. | Existing integration semantics; changing them alters import behavior AGENTS.md says to inspect first. Flagged for owner decision (undated import vs fabricated deadline). |
| D-05 | `app.js` `applyMoodleCourseSync` merge | Re-sync never refreshes title/dueDate of existing tasks from upstream (local edits win entirely). | Documented invariant (DATA-MODEL §5.2 "Existing task edits win"). A field-level merge policy is a product decision. |
| D-06 | pre-existing | Manila-vs-browser-local calendar grid, empty-snapshot double-seed race, no token refresh / offline write queue. | Documented debt in AGENTS.md; intentionally untouched. |

## 4. Verified sound (checks that passed)

- `firestore.rules` accept `dueDate: ''` (string ≤ 64) — the new "no deadline" editor path needs **no rule or blueprint change**; `groupByDeadline`/`formatDueDate`/ICS export already handle falsy dates.
- All `parseIcsEvents` call sites (GCal iCal, Moodle iCal, Classroom iCal, paste import) resolve to the shared module with unchanged signatures; `offsetDateISO` remains in `app.js` for demo data/quick-add.
- `fetchPublicUpstream` preserves the 15 s upstream timeout and the `CALEN_ALLOW_PRIVATE_UPSTREAMS` escape hatch (unit-tested).
- Baseline auth suite (user's in-progress work) still passes unchanged: 14 → 36 tests, zero regressions.
- `writeDb` atomic temp-file rename, SSE client cleanup, and the token gate are unchanged.

## 5. Review boundaries (what was NOT tested)

- Runtime smoke ran on scratch port 3210 (results in §1). Not covered live: a real public→private redirect (httpbin unreachable from this host; mocked tests cover it), the 25 s SSE heartbeat interval (observation window was 3 s), and token-gated mode (unchanged by this pass).
- No browser drive of the UI changes (undated-task editing, banner, bulk-push dialog) — code-reviewed and unit-tested at the pure-logic layer only.
- Firestore behavior (N-03/N-04) reviewed against rules and the snapshot flow, not run in an emulator (none exists in this repo).
- Redirect guard tested with mocked `fetch`; the live public-redirector probe (httpbin) ran but was inconclusive — the host is unreachable from this machine.

## 6. Recommended features (prioritized)

1. **Classroom cloud home** — `/users/{uid}/classroom_courses` + symmetric sync (closes D-03 and prior audit follow-up 2). Rules + blueprint + DATA-MODEL together.
2. **Offline write queue + conflict surface** — queue Firestore writes when offline, replay on reconnect; show a "changed on another device" banner instead of silent last-write-wins.
3. **Silent token refresh / re-consent UX** — GIS token client refresh or a one-click reconnect banner when the in-memory token expires (reload currently loses Calendar consent by design).
4. **Deadline notifications** — Notification API (+ optional service worker) for due-soon/overdue tasks; the banner only surfaces one deadline.
5. **Recurring tasks** — `RRULE` support in the parser plus a repeat field in the editor (common for weekly problem sets).
6. **DNS-rebinding-safe proxies (D-02a)** — resolve-then-connect dispatcher if the tunnel is shared beyond trusted devices.
7. **Timezone unification decision** — make the calendar grid Manila-aware (or make everything browser-local) with tests for both call sites.
8. **PWA install + offline shell** — service-worker precache so "offline-first" survives a cold load without network.
9. **UI + rules test harness** — Playwright smoke for modal/sync flows; Firestore emulator rules tests (would have caught N-03 class bugs mechanically).
10. **Data portability** — full JSON/CSV export and re-import (backup/restore beyond the tasks-only `#sync=` link).
11. **Direct manipulation** — kanban drag-and-drop and calendar drag-to-reschedule.
12. **Deeper search & saved filters** — search description/subtasks; persist filter sets.
