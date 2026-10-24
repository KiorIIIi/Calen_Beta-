# Calen Architectural System Documentation

This document explains how Calen is structured, how data moves through the system, and where to make changes safely.

## 1. Architectural Style

Calen is a **client-only, offline-first single-page application** with a **static shell and a mutable in-memory state tree**.

- No custom application server, API routes, or server-side rendering exist in this repository.
- The browser renders the entire UI and stores data in `localStorage` immediately, then optionally mirrors it to Cloud Firestore when a user signs in.
- Firebase supplies authentication and the real-time database. Google Calendar supplies an external event store accessed directly over REST.
- The UI is rendered by assigning HTML strings to container elements; there is no component framework, virtual DOM, or reactive binding.

### High-level topology

```text
+----------------------------- Browser ------------------------------+
|                                                                    |
|  index.html (static shell, views, 5 dialogs)                       |
|        |                                                           |
|        | loads /src/style.css and /src/app.js                      |
|        v                                                           |
|  app.js  -------- imports ------> deadlines.js (pure functions)    |
|     |                                                              |
|     |--------- imports ------> firebase.js --------------------+   |
|     |                                                           |   |
|     v                                                           |   |
|  state + render + DOM events                                    |   |
|     |                                                           |   |
|     +--> localStorage  (always)                                 |   |
|     +--> BroadcastChannel (same-origin tabs)                    |   |
|     +--> #sync= URL handoff (manual device transfer)            |   |
|                                                                 |   |
+-----------------------------------------------------------------+---+
                                                                  |
                         +----------------------------------------+
                         |                                        |
                         v                                        v
              +-------------------+                   +----------------------+
              | Firebase          |                   | Google Calendar API  |
              | Auth + Firestore  |                   | REST v3              |
              +-------------------+                   +----------------------+
                         ^
                         |
              firestore.rules (deployed authorization)
```

## 2. Repository Layout

```text
CALEN/
|-- index.html                    Static shell: sidebar, task view, calendar view,
|                                 quick-add bar, filters, task/settings/moodle/
|                                 calendar/confirmation dialogs
|-- src/
|   |-- app.js                    Application state, rendering, event wiring,
|   |                             moodle course demo data, iCal parser, feature flows
|   |-- firebase.js               Firebase init, auth helpers, Firestore helpers,
|   |                             Google Calendar REST helpers
|   |-- deadlines.js              Pure timezone-aware deadline grouping
|   `-- style.css                 Design tokens, layout, components, themes, responsive rules
|-- public/assets/                Local SVG icons and images
|-- tests/deadlines.test.js       Node built-in unit tests
|-- firebase-applet-config.json   Firebase web config and OAuth client ID
|-- firebase-blueprint.json       Collection/entity schema blueprint
|-- firestore.rules               Deployed security and validation rules
|-- metadata.json                 AI Studio metadata
|-- vite.config.js                Vite configuration
|-- package.json                  Scripts and dependencies
|-- README.md                     User-facing setup and feature overview
|-- UI-DESIGN.md                  UI implementation notes
`-- doc/                          This documentation set
```

## 3. Module Responsibilities

### 3.1 `index.html` - Presentation Shell

- Owns all static markup and element IDs consumed by `app.js`.
- Contains two top-level views: `#view-tasks` and `#view-calendar`.
- Contains five modal overlays:
  - `#modal-task` - create/edit assignment
  - `#modal-settings` - theme, integrations, sync link, reset demo data
  - `#modal-moodle` - course selection, sync, iCal import
  - `#modal-gcal` - Google Calendar authorization and sync hub
  - `#modal-confirm-gcal` - explicit confirmation for Google mutations
- Loads `/src/style.css` in the head and `/src/app.js` as an ES module at the end of the body.

### 3.2 `src/app.js` - Application Core

Single module that owns:

| Concern | Representative functions |
| :--- | :--- |
| State container | `state` object |
| Local persistence | `loadLocalState`, `saveLocalState` |
| Theme | `applyTheme` |
| Filtering/sorting | `getVisibleTasks`, `sortTasks` |
| Rendering | `renderAll`, `renderTasksSection`, `buildTableHtml`, `buildDeadlineHtml`, `renderCalendarSection`, `renderSettingsSyncStatus`, `renderReminderBanner`, `renderPriorityFocusBar` |
| Task mutations | `persistTask`, `toggleTaskCompleted`, `cycleTaskPriority`, `cycleTaskStatus` |
| Google Calendar flows | `ensureGoogleCalendarToken`, `handleGcalImport`, `handleGcalBulkExportPrompt`, `openGcalConfirmation`, `renderGcalModalContent` |
| Dialogs | `openNewTaskModal`, `openTaskModal`, `openMoodleModal`, `openSettingsModal`, `renderDraftSubtasks` |
| Moodle | `applyMoodleCourseSync`, iCal parser inside `initEvents` |
| Event wiring | `initEvents` |
| Bootstrap | `loadLocalState(); initEvents(); renderAll();` |

### 3.3 `src/firebase.js` - Cloud and External API Boundary

- Initializes Firebase once and exports `db` and `auth`.
- Runs a best-effort Firestore connectivity check against `test/connection`.
- Owns the OAuth provider, requested scopes, and the in-memory access-token cache.
- Exposes auth helpers: `googleSignIn`, `getAccessToken`, `logoutUser`, `subscribeAuth`, `initAuth`.
- Exposes Firestore helpers: `subscribeUserWorkspace`, `saveTaskToFirestore`, `deleteTaskFromFirestore`, `saveMoodleCoursesToFirestore`, `saveSettingsToFirestore`, `seedWorkspaceToFirestore`.
- Exposes Calendar helpers: `fetchGoogleCalendarEvents`, `upsertGoogleCalendarEvent`, `deleteGoogleCalendarEvent`.
- Normalizes Firestore failures through `handleFirestoreError`, which logs structured auth context and rethrows a JSON error.

### 3.4 `src/deadlines.js` - Pure Domain Logic

Two functions with no DOM or network dependencies:

- `dayKey(value)` returns a `YYYY-MM-DD` key in `Asia/Manila` for a date value.
- `groupByDeadline(tasks, now)` groups tasks into `Overdue`, `Today`, `Upcoming`, `No date`, and `Completed`.

This module is the only part covered by automated tests.

### 3.5 `src/style.css` - Design System

- CSS variables for light and dark themes (`:root` and `.dark`).
- Semantic color groups: rose, peach, butter, sage, sky, lavender, stone.
- Layout for sidebar, task views, table, deadline list, Kanban, calendar grid, dialogs, and forms.
- Responsive breakpoints at roughly `1100px`, `768px`, and `760px`.
- Reduced-motion handling via `prefers-reduced-motion: reduce`.
- No CSS preprocessor; values are standard CSS custom properties.

## 4. Startup and Lifecycle

### 4.1 Boot sequence

```text
1. Browser loads index.html.
2. style.css is applied.
3. app.js executes as an ES module.
4. app.js imports deadlines.js and firebase.js.
5. firebase.js initializes Firebase and starts testConnection().
6. app.js calls loadLocalState():
   - parses an optional #sync= transfer payload,
   - reads tasks, Moodle courses, and settings from localStorage,
   - falls back to demo data and defaults when absent or corrupt.
7. app.js calls initEvents():
   - installs dialog focus management and keyboard handling,
   - binds all view, filter, form, theme, sync, and dialog controls,
   - subscribes to BroadcastChannel,
   - subscribes to Firebase auth state.
8. app.js calls renderAll() to paint the initial UI.
```

### 4.2 Authentication lifecycle

```text
subscribeAuth(callback)
        |
        v
onAuthStateChanged(auth)
        |
        +-- user present + cached token --> callback(user, token): cloud mode
        +-- user present, no token     --> callback(user, null): signed in locally,
        |                                  Calendar API not currently authorized
        +-- no user                    --> callback(null, null): local-only mode
```

When the user becomes available, `app.js` subscribes to the user's Firestore workspace. Any previous subscription is unsubscribed first, preventing duplicate listeners across sign-in/sign-out cycles.

The token is deliberately held only in `cachedAccessToken`. A page reload signs the Firebase user back in but clears Calendar API authorization, requiring re-consent before Calendar operations. This is a security trade-off, not an oversight.

### 4.3 Firestore subscription behavior

`subscribeUserWorkspace(uid, { onTasks, onMoodleCourses, onSettings })` opens three listeners:

- tasks collection
- Moodle courses collection
- the `settings/preferences` document

On the first non-empty task snapshot, cloud data replaces local state and re-renders. If the cloud task collection is empty while local tasks exist, the app seeds the workspace to Firestore. This makes first sign-in adopt existing local work.

## 5. State Model

All application state lives in one mutable object in `app.js`:

```js
const state = {
  activeView, subView, calMode, calCursor,
  priorityFilter, sourceFilter, courseFilter, statusFilter,
  searchQuery, sortBy, reminderDismissed,
  editingTaskId, draftSubtasks,
  user, hasGcalToken, unsubFirestore, pendingConfirmCallback,
  tasks, moodleCourses, settings
};
```

Categories:

| Category | Fields |
| :--- | :--- |
| Navigation | `activeView`, `subView`, `calMode`, `calCursor` |
| Filtering | `priorityFilter`, `sourceFilter`, `courseFilter`, `statusFilter`, `searchQuery`, `sortBy` |
| UI/session | `reminderDismissed`, `editingTaskId`, `draftSubtasks`, `pendingConfirmCallback` |
| Identity/cloud | `user`, `hasGcalToken`, `unsubFirestore` |
| Domain data | `tasks`, `moodleCourses`, `settings` |

Notes:

- State is mutated directly; there is no reducer or immutable update layer.
- Filters and UI state are not persisted; only tasks, courses, and settings are.
- `draftSubtasks` isolates edit-dialog changes until the form is submitted.

## 6. Data Flow

### 6.1 Read and render path

```text
localStorage / Firestore snapshot
        |
        v
state.tasks
        |
        v
getVisibleTasks()  -- platform toggle, priority, source, course,
        |              status, full-text search
        v
sortTasks()       -- completed last; then due date, priority, or source
        |
        v
renderTasksSection() / renderCalendarSection()
        |
        v
container.innerHTML = generated HTML
        |
        v
attachTaskTableListeners(container) reattaches row-level events
```

### 6.2 Write path

```text
User action (checkbox, badge cycle, form submit, quick add, delete)
        |
        v
mutate state.tasks in place
        |
        v
persistTask(task) or explicit saveLocalState()
        |
        +--> localStorage.setItem for tasks/courses/settings
        +--> BroadcastChannel.postMessage (other tabs)
        +--> saveTaskToFirestore(uid, task) if signed in
        |
        v
renderAll() or renderTasksSection()
```

Writes are optimistic: local storage and the UI update first, then the cloud write proceeds. A failed cloud write is logged and thrown by `handleFirestoreError`; there is no retry queue or conflict-resolution layer.

### 6.3 Persistence layers

| Layer | Scope | Trigger | Conflict behavior |
| :--- | :--- | :--- | :--- |
| `localStorage` | Per browser profile | Every mutation | Last local write wins |
| `BroadcastChannel` (`calen_sync_channel`) | Other tabs, same origin | Every local save with broadcast enabled | Receiver overwrites local state with sender payload |
| Cloud Firestore | Per signed-in user, all devices | Every mutation while signed in | Real-time snapshots overwrite local state |
| `#sync=` URL | Manual transfer to another device | Opening a generated link | Imports tasks only, then strips the hash |

Local storage keys:

```text
calen_html_tasks_v2
calen_html_moodle_courses_v2
calen_html_settings_v2
```

The `#sync=` link is built with `btoa(unescape(encodeURIComponent(JSON.stringify({ tasks }))))`. It contains task data in the URL and should be treated as sensitive. It is a convenience mechanism, not an authenticated sync channel.

## 7. Rendering Architecture

### 7.1 Views

| View | State selector | Renderer |
| :--- | :--- | :--- |
| Tasks - Deadline | `subView === 'deadline'` | `buildDeadlineHtml` |
| Tasks - Table | `subView === 'table'` | `buildTableHtml` |
| Tasks - By Priority | `subView === 'priority'` | `buildTableHtml` per priority group |
| Tasks - By Platform | `subView === 'platform'` | `buildTableHtml` per source group |
| Tasks - Board | `subView === 'board'` | Kanban columns by status |
| Calendar - Month | `calMode === 'month'` | `renderCalendarSection` |
| Calendar - Week | `calMode === 'week'` | `renderCalendarSection` |

### 7.2 Rendering characteristics

- Rendering is **full-section replacement** through `innerHTML`. Listeners on replaced nodes are discarded and reattached by `attachTaskTableListeners` or per-render bindings.
- `renderAll()` calls theme, shell, sync status, reminder banner, priority bar, tasks, calendar, and Google Calendar modal rendering.
- A few interactions re-render only the tasks section for responsiveness (search, course filter, sort, subview changes).
- `escapeHtml` is applied to user-controlled text before interpolation. Any new interpolation must follow this rule.
- The completed-tasks disclosure open state is captured before re-render and restored afterward.

### 7.3 Dialog behavior

A `MutationObserver` watches each `.modal-overlay` class for open/close transitions:

- On open, the previously focused element is saved, the dialog is pushed to a stack, and its first focusable control receives focus.
- On close, the dialog is removed from the stack and focus returns to the trigger if still connected.
- `Escape` clicks the dialog's close button (matched by `[id^="close-"]`).
- `Tab` and `Shift+Tab` wrap within the topmost dialog.
- Overlay z-index layers dialogs: base dialogs, then Moodle/Calendar at `70`, then confirmation at `80`.

## 8. Feature Subsystems

### 8.1 Task management

- Tasks are created through the quick-add bar or the task dialog.
- The quick-add bar defaults a new task to tomorrow at `23:59`.
- The task dialog supports title, priority, status, source, course, due date, due time, description, and checklist subtasks.
- Inline controls cycle priority (`low -> medium -> high -> urgent`) and status (`todo -> in_progress -> completed`).
- Deleting a task removes it locally, then from Firestore if signed in. It does not delete a linked Google Calendar event automatically.
- Completing a task only changes Calen state; it does not submit anything to Moodle, Classroom, Notion, or Trello.

### 8.2 Filtering and sorting

`getVisibleTasks` applies, in order:

1. Platform toggle from settings (personal tasks are always visible).
2. Priority filter.
3. Source filter.
4. Course filter.
5. Status filter (`pending`, `completed`, or `today`).
6. Case-insensitive substring search over title, course, and source.

`sortTasks` always places completed tasks last, then sorts by due date, priority weight, or source, depending on `sortBy`.

### 8.3 Calendar view

- Month mode builds a 7-column grid including leading/trailing days from adjacent months.
- Week mode builds a single Sunday-to-Saturday row.
- Each cell lists tasks due on that local calendar date.
- `+` on a cell opens the new-task dialog prefilled with that date.
- Clicking an event chip opens its task dialog.
- Calendar navigation and "Today" operate on `state.calCursor`.
- Date display and deadline grouping use `Asia/Manila`, while the calendar grid uses the browser's local date methods. This is a documented inconsistency to keep in mind when modifying date behavior.

### 8.4 Google Calendar two-way sync

**Authorization**

`ensureGoogleCalendarToken` first checks the in-memory token; if missing, it triggers Google sign-in and re-renders.

**Import (Google -> Calen)**

1. Fetch primary-calendar events from 7 days ago to 30 days ahead (max 50).
2. Skip cancelled events and events without usable dates.
3. Match existing tasks by `gcalEventId` or `gcal-<eventId prefix>`.
4. Update matched tasks or insert new tasks with `source: 'google_calendar'`.
5. Persist to local storage and Firestore when signed in.
6. Report counts in the sync feedback box.

Imported event titles have a leading `[Calen]` marker stripped.

**Export (Calen -> Google)**

1. Collect all non-completed tasks.
2. Show an explicit confirmation dialog listing each task.
3. On confirm, upsert each task serially.
4. Store the returned event ID in `task.gcalEventId`.
5. Persist and report the number pushed.

**Single-task sync**

The task dialog exposes "Sync to Google Calendar" or "Update on Google Calendar" with the same confirmation pattern.

**Delete**

Deleting a synced task from Google requires confirmation. If the task originated from Google Calendar, its Calen task is removed too; otherwise only `gcalEventId` is cleared.

**Event shape**

- Title: `[Calen] <title>`
- Description: task description plus priority and source/course
- Start: one hour before the deadline
- End: the deadline

`upsertGoogleCalendarEvent` uses `PUT` when `gcalEventId` exists and falls back to `POST` if Google returns `404` (event deleted remotely).

### 8.5 Moodle subsystem

**Configured course sync**

`DEFAULT_MOODLE_COURSES` contains sample courses and assignments. Enabling a course and saving merges its assignments into `state.tasks` while preserving task edits by ID. Unsynchronized built-in Moodle assignments are removed. Courses and tasks are mirrored to Firestore when signed in.

**iCal import**

The parser splits the pasted text on `BEGIN:VEVENT`, extracts `SUMMARY` and `DTEND`/`DTSTART`, converts the basic iCalendar timestamp to ISO, and creates high-priority Moodle tasks. It does not implement full RFC 5545 support (line folding, timezones, escaped text, recurrence, or `VALUE=DATE` semantics).

### 8.6 Settings and theming

Settings include:

- Theme: `light`, `dark`, or `system`.
- Platform visibility toggles for Moodle, Google Calendar, Google Classroom, Notion, and Trello.
- Google account sign-in/out.
- Sync share-link generation and copy.
- Reset to demo data.

Platform toggles affect filtering only. They do not disable integrations or delete data.

### 8.7 Device transfer link

`openSettingsModal` generates a URL with a base64-encoded task payload. `loadLocalState` detects `#sync=`, imports the tasks into local storage, and replaces the URL to remove the payload from the address bar.

## 9. Security Model

### 9.1 Firestore rules

Deployed rules in `firestore.rules`:

- Deny all access by default.
- Allow access to `test/{docId}` reads for connectivity checks; writes denied.
- Require authentication and match `request.auth.uid` to the `userId` path for user data.
- Validate document IDs and task fields, including title length, due date length, allowed source, status, priority, and `uid` ownership.
- Allow Moodle course and settings writes only when IDs are valid and, for courses, `uid` matches.

See [DATA-MODEL.md](./DATA-MODEL.md) for exact schemas.

### 9.2 Client-side protections

- OAuth access tokens stay in memory only; sign-out clears them.
- User text is HTML-escaped before insertion into rendered markup.
- Google Calendar mutations require an explicit confirmation dialog.
- Calendar API `401`/`403` responses clear the cached token and surface `NEEDS_AUTH`.
- Firestore errors are logged with non-secret account context and rethrown.

### 9.3 Security caveats

- The Firebase web config is public by design; actual protection comes from Firebase console settings and Firestore rules.
- The transfer link embeds task data in the URL. Anyone with the link can read it.
- `BroadcastChannel` has no origin beyond same-origin isolation; any same-origin script can post updates.
- `CSP`, `SRI`, and a formal threat model are not configured.

## 10. Accessibility and UX Architecture

Implemented accessibility features:

- Skip link to the workspace.
- Semantic landmarks: sidebar, main, navigation.
- `aria-label`, `aria-current`, `aria-pressed`, and `aria-expanded` on interactive controls.
- Dialog focus trapping, focus restore, and Escape-to-close.
- Keyboard-reachable buttons and form controls.
- `prefers-reduced-motion` support in CSS.
- Responsive sidebar collapse and mobile navigation in the stylesheet.

## 11. Build, Run, and Deployment

### 11.1 Scripts

| Command | Effect |
| :--- | :--- |
| `npm run dev` | Vite dev server on `0.0.0.0:3000` |
| `npm run build` | Static production build in `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` | `node --check` syntax validation |
| `npm run clean` | Remove `dist/` and `server.js` |

### 11.2 Deployment model

The output is a static site. It can be hosted on any static host that serves `dist/`, with these prerequisites:

1. Replace `firebase-applet-config.json` with the target Firebase project credentials.
2. Enable the Google sign-in provider.
3. Add the deployment domain to Firebase Authentication's authorized domains.
4. Enable the Google Calendar API and allow the `calendar.events` scope on the OAuth consent screen.
5. Deploy `firestore.rules` to the target Firestore database.

The project is also structured for AI Studio applet hosting, as indicated by `metadata.json` and `.env.example`.

## 12. Known Constraints and Technical Debt

1. **Unused declared dependencies**: React, Tailwind utilities, Express, TypeScript, `motion`, `lucide-react`, and `@google/genai` are not exercised by the current source.
2. **Single large module**: `src/app.js` is about 2,000 lines and mixes state, rendering, and feature logic.
3. **String-based rendering**: `innerHTML` replacement requires disciplined escaping and listener reattachment; it also discards transient DOM state.
4. **No server**: There is no place for secrets, scheduled jobs, webhook receivers, or trusted OAuth token exchange.
5. **No live Notion, Classroom, or Trello clients**: These sources exist as filters, demo data, and visibility toggles.
6. **Google token lifetime**: The access token is not proactively refreshed; a reload or expiry requires sign-in again.
7. **No offline write queue**: Cloud writes fail immediately when offline; there is no retry or conflict resolution.
8. **Seeding limits**: `seedWorkspaceToFirestore` uses one `writeBatch`; Firestore caps a batch at 500 writes.
9. **Simplified iCal parser**: Handles basic event blocks only.
10. **Timezone split**: Deadline grouping uses `Asia/Manila`; calendar-grid grouping uses browser local time.
11. **No automated UI tests**: Only `deadlines.js` has unit coverage.
12. **Potential duplicate seeding**: The empty-snapshot seeding path can run again if local state remains non-empty before the seeded snapshot arrives.

## 13. Safe Extension Points

| Goal | Recommended approach |
| :--- | :--- |
| Add a new task source | Extend `SOURCE_META`, the source `<select>` options, settings platform keys, and Firestore rules' allowed source list |
| Add a new task layout | Add a `subView` branch in `renderTasksSection` and a matching control in `index.html` |
| Add a server-backed integration | Introduce a backend or serverless proxy; do not ship API secrets in client code |
| Replace the renderer | Keep `state`, `deadlines.js`, and `firebase.js` as boundaries, then introduce a component layer that reads the same state |
| Add new persisted fields | Update `saveTaskToFirestore`, `firebase-blueprint.json`, and `firestore.rules` validation together |
| Add new tests | Use `node:test`; keep pure logic in modules without DOM dependencies |
| Improve Google sync | Add token refresh, retry/backoff, and conflict detection around the existing `firebase.js` helpers |
