# AGENTS.md

Notes and working context for AI agents (and humans) operating on this repository. Keep this file short and factual; keep long-form documentation in `doc/`.

## What this project is

**Calen** — a Notion-inspired academic planner. Vanilla-JS single-page web app that unifies deadlines from Moodle, Google Classroom, Google Calendar, Notion, and Trello into one task list and calendar. Offline-first via `localStorage`, with optional Firebase cloud sync (Auth + Firestore) and two-way Google Calendar sync. No custom server.

## Critical facts — read before editing

- **Not React.** `package.json` is named `react-example` and lists React, Tailwind, Express, TypeScript, `motion`, `lucide-react`, `@google/genai`, and `dotenv`, but **none of them are imported or used**. The app is vanilla ES modules + HTML + hand-written CSS. Do not add React code.
- **Timezone is `Asia/Manila`.** `src/deadlines.js` (dayKey, groupByDeadline) uses it; most displayed deadline labels use it. The calendar grid (`renderCalendarSection`) uses browser-local dates — a known inconsistency. Never "fix" the timezone without checking both call sites and the tests.
- **Rendering is string-based.** Views are rebuilt with `container.innerHTML = ...`. After any re-render, reattach listeners (`attachTaskTableListeners`) and re-capture transient UI state (e.g. the `.deadline-completed` open flag). Always pipe user text through `escapeHtml` before interpolation.
- **OAuth tokens are in-memory only.** The Google access token lives in `cachedAccessToken` in `src/firebase.js` and is deliberately never persisted. A page reload signs the Firebase user back in but requires Calendar re-consent. Do not "fix" this by storing the token.
- **Writes are optimistic and local-first.** Every mutation: update `state.tasks` in place → `saveLocalState()` (localStorage + BroadcastChannel) → `renderAll()` → Firestore write if signed in. There is no retry queue or conflict resolution.
- **`npm install` may need `--legacy-peer-deps`** (esbuild/Vite peer conflict, noted in `UI-DESIGN.md`).
- **Lint is only a syntax check** (`node --check`). There is no ESLint, Prettier, or type-check step.

## Commands

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Vite dev server on `0.0.0.0:3000` |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | Syntax check on `src/app.js` and `src/firebase.js` |
| `npm run clean` | Remove `dist/` and `server.js` |
| `node --test tests/deadlines.test.js` | Unit tests (not wired to an npm script) |

After any edit: run `npm run lint` and, if touching deadline logic, `node --test tests/deadlines.test.js`.

## Key files

| File | Role |
| :--- | :--- |
| `index.html` | Static shell: sidebar, tasks/calendar views, quick-add, 5 modal dialogs (`#modal-task`, `-settings`, `-moodle`, `-gcal`, `-confirm-gcal`) |
| `src/app.js` (~2000 lines) | All app state, rendering, event wiring, Moodle demo data, iCal parser, feature flows |
| `src/firebase.js` | Firebase init, Google auth (in-memory token), Firestore helpers, Google Calendar REST helpers |
| `src/deadlines.js` | Pure timezone-aware deadline grouping (the only tested module) |
| `src/style.css` | Design tokens (light/dark via `.dark` class), layout, components, responsive breakpoints |
| `firestore.rules` | Deployed auth + field validation; deny-by-default, per-user isolation |
| `firebase-blueprint.json` | Entity schema reference (keep in sync with rules when schema changes) |
| `firebase-applet-config.json` | Firebase web config (public by design) |
| `vite.config.js` | `@` alias, `allowedHosts`, `DISABLE_HMR` switch; no plugins registered |
| `doc/` | Full documentation — see below |

## Architecture in one paragraph

`index.html` loads `src/app.js`, which imports `deadlines.js` and `firebase.js`. One mutable `state` object holds everything. `renderAll()` re-renders sections by assigning HTML strings to containers. Persistence: `localStorage` (keys `calen_html_*_v2`) always, `BroadcastChannel('calen_sync_channel')` across tabs, Firestore (`/users/{uid}/tasks|moodle_courses|settings/preferences`) when signed in, and a `#sync=` base64 URL for manual device transfer. First sign-in with an empty cloud seeds local data up. Google Calendar sync is two-way with an explicit confirmation dialog before every mutation; events are created as `[Calen] <title>`, one hour ending at the deadline.

## Conventions

- Mutate `state` directly (no reducer); filters/UI state are not persisted, only tasks/courses/settings.
- New task IDs: `task-${Date.now()}`; Google imports: `gcal-<eventId prefix>`; Moodle iCal: `mdl-ical-<ts>-<i>`.
- Any new persisted field must be updated together in: `src/app.js` write paths → `src/firebase.js` helpers → `firestore.rules` validation → `firebase-blueprint.json` → `doc/DATA-MODEL.md`.
- Any new task source must be added to `SOURCE_META`, the source select options, settings platform keys, and the rules' allowed-source list.
- Dialogs: focus trap + Escape handled globally in `initEvents` via `[id^="close-"]`; overlay z-index layering (70 for moodle/gcal, 80 for confirm).
- Keep new long-form docs in `doc/`, not the root.

## Full documentation

- `doc/TECH-STACK.md` — dependencies (incl. unused ones), tooling, config
- `doc/ARCHITECTURE.md` — modules, data flow, subsystems, security, extension points, known debt
- `doc/DATA-MODEL.md` — schemas, storage keys, Firestore paths, invariants
- `README.md` — user setup and features
- `UI-DESIGN.md` — UI pass notes, Figma reference, validation commands

## Known technical debt (do not silently "fix" without checking)

- One 2000-line `src/app.js` mixing state, rendering, and features.
- `innerHTML` string rendering (escaping + listener reattachment burden).
- No live Notion/Classroom/Trello clients — sources are filters + demo data only.
- No token refresh, offline write queue, or conflict resolution.
- `seedWorkspaceToFirestore` uses one batch (Firestore caps at 500 writes).
- Moodle iCal parser is minimal (no folding, TZ, recurrence, `VALUE=DATE`).
- Empty-snapshot seeding can double-seed if local state is non-empty before the snapshot lands.
- Deadline grouping is Manila-time; calendar grid is browser-local.
- Only `deadlines.js` has tests; no UI tests.

---

## Agent notes (append-only)

Log dated entries here when you make non-trivial decisions, discover facts, or leave work unfinished. Newest first. Keep each entry to a few lines.

### 2026-10-23
- Created `doc/` documentation set (README, TECH-STACK, ARCHITECTURE, DATA-MODEL) by reading the full source. Confirmed React/Tailwind/Express/TS are unused deps despite package.json. Vite config has no plugins registered. Created this AGENTS.md.
