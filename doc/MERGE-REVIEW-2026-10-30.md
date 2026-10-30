# Core merge review: development into main

30 October 2026, Asia/Manila.

## Scope and user decision

The user requested merging `codex/development` into `main`, then requested a core review of conflicts. The reviewed inputs were development `b151ed205d40f6f8dae82741b2b3444bb2e6e42b` and main `42ccd6b82000bf388949f9fc9283a97292a39c07`.

When asked how to resolve the different workflows, the user selected **Keep codex/development's current workflow**. This means the local workspace, current Figma task layout, Vite JSON/SSE sync, Moodle/Classroom imports, current browser storage keys, and disabled Google popup login remain the active behavior.

## Findings and resolutions

Git reported four conflicted files with 25 conflict regions: `index.html` (11), `src/app.js` (12), `src/firebase.js` (1), and `src/style.css` (1).

| Finding | Consequence of a partial merge | Resolution |
| --- | --- | --- |
| Main's login/onboarding shell and development's local workspace use different element IDs, visibility state, and event handlers. | A mixed shell can hide the workspace or attach listeners to missing login elements. | Keep the complete development HTML and application code together. |
| Main uses `calen_clean_*_v3` storage and legacy-demo cleanup; development uses `calen_html_*_v2`, Classroom storage, and timestamp-based server sync. | Mixing read/filter/reset logic can hide cached tasks, reference missing identifiers, or unexpectedly purge records. | Keep development storage and synchronization unchanged. No migration, cache clearing, seeding of existing data, or cloud cleanup was performed. |
| Firebase helpers have incompatible basic-sign-in, Calendar-sign-in, seeding, and bulk-deletion changes. | Choosing only the development conflict chunk leaves two `googleSignIn` declarations; the candidate fails Node syntax validation. | Keep the complete development Firebase module, its imports, and the disabled-login guard. |
| The platform import dialogs, Moodle controls, and theme handlers evolved separately. | Mixed controls and listeners can leave missing elements, duplicated handlers, and a syntax error in the application module. | Keep the complete development dialog/handler set and styles. |

All four resolved core files match the reviewed development versions. Main's three image assets were retained. No new authentication flow or integration capability was introduced by the conflict resolution.

## Verification

Checks performed on the isolated resolved checkout:

- `npm run lint`: passed; checks `src/app.js` and `src/firebase.js` syntax.
- `node --check vite.config.js`: passed.
- `node --test tests/deadlines.test.js`: both tests passed.
- `npm run build`: passed. Vite reports the existing JavaScript chunk larger than 500 kB; this is a warning, not a failed build.
- Git index check: no unresolved files or whitespace errors. No conflict markers remained in the four core files.
- Headless installed Chrome with a fresh synthetic JSON workspace and two separate browser contexts: local workspace opens without login; empty Moodle/Classroom arrays stay empty; quick-add persists to JSON; server sync reaches the second browser; reload retains the task; calendar, settings and Classroom dialogs open; the iCalendar endpoint responds; no browser page errors.

The browser check ran on loopback port 3015 in the isolated integration worktree. Its synthetic data was written only to that worktree's ignored `data/` directory. Its temporary server and browser were stopped afterward. The existing development database, backups, original browser profiles, and cloud records were not modified by verification.

## Boundaries to remember

- Old main browser data in `calen_clean_*_v3` keys is not automatically migrated into the selected development workflow. Those old keys were not deleted. If records from that workflow are needed, export/inspect them separately before any deliberate migration.
- Google popup sign-in remains disabled and access tokens remain memory-only. Live Google/Moodle credentials and institutional integrations were not tested.
- The existing shared Vite workspace/proxy endpoints are not authenticated per-user hosting. This merge does not add public-hosting authorization or production hardening.
- The deadline/calendar timezone inconsistency, minimal iCal parsing, whole-workspace conflict handling, and limited automated test coverage remain existing debt.
- Publishing source or merging branches does not itself authorize starting a public tunnel or deploying the application.

## Links

- [Documentation index](README.md)
- [Current setup](../README.md)
- [Local hosting and integration notes](HOW-TO-HOST.md)
- [UI reference](../UI-DESIGN.md)
