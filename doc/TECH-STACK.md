# Calen Tech Stack

This document describes the technologies used by Calen, why they are present, and which dependencies are actually exercised at runtime.

## 1. Stack Overview

| Layer | Technology | Role |
| :--- | :--- | :--- |
| Markup | HTML5 | Static application shell, views, navigation, and modal dialogs (`index.html`) |
| Styling | CSS3 with custom properties | Hand-written design system, light/dark themes, responsive layout (`src/style.css`) |
| Application logic | Vanilla JavaScript (ES modules) | State, rendering, event handling, and feature logic (`src/app.js`, `src/deadlines.js`) |
| Build/dev server | Vite 8 | Module bundling, HMR, and local/preview server (`vite.config.js`) |
| Cloud auth | Firebase Authentication 13 | Google sign-in and session identity |
| Cloud database | Cloud Firestore | Per-user real-time persistence of tasks, courses, and settings |
| External API | Google Calendar REST API v3 | Two-way event import/export using an OAuth access token |
| Testing | Node.js `node:test` + `node:assert/strict` | Unit tests for deadline grouping |
| Package manager | npm or Bun | Dependency installation and script execution |

## 2. Runtime Environment

- **Browser:** modern evergreen browser with ES modules, `structuredClone`, `Intl`, `BroadcastChannel`, and `MutationObserver`.
- **Node.js:** v18+ is sufficient for the build and tests (README states v18+; Bun v1+ also supported).
- **Server-side runtime:** none in this repository. Firebase provides the backend services; the app is served as static assets.
- **Default dev server:** Vite on port `3000`, bound to `0.0.0.0` (`npm run dev`).

## 3. Frontend

### 3.1 Vanilla JavaScript, not React

`package.json` includes React-related packages and the package name is `react-example`, but the shipped application does **not** import or render React. The user interface is built with:

- Semantic HTML in `index.html`
- Template-literal HTML strings generated in `src/app.js`
- Direct DOM APIs (`querySelector`, `innerHTML`, `classList`, event listeners)
- ES module imports between `app.js`, `deadlines.js`, and `firebase.js`

### 3.2 Styling

- Custom CSS in `src/style.css` (about 1,340 lines).
- CSS custom properties define the palette and semantic tokens for light and dark themes.
- `document.documentElement.classList.toggle('dark', isDark)` switches the theme.
- The `system` preference follows `prefers-color-scheme`.
- Typography: Fraunces, Plus Jakarta Sans, and JetBrains Mono loaded from Google Fonts.
- Tailwind CSS 4 and `@tailwindcss/vite` are installed, but neither is registered in `vite.config.js` and the current UI does not use Tailwind utility classes.
- Icons are inline SVG or local assets under `public/assets/figma/`.

### 3.3 Build Configuration

`vite.config.js` provides:

- `@` alias pointing to the project root
- `allowedHosts: true` for the dev server and preview
- HMR controlled by `DISABLE_HMR`
- No plugins configured; `@vitejs/plugin-react` is installed but not registered

## 4. Backend and Cloud Services

### 4.1 Firebase Authentication

- Google provider via `GoogleAuthProvider` and `signInWithPopup`.
- Requests the `https://www.googleapis.com/auth/calendar.events` OAuth scope.
- The OAuth access token is cached only in memory; it is never written to `localStorage` or `sessionStorage`.
- Authentication state is observed with `onAuthStateChanged`.

### 4.2 Cloud Firestore

- Client initialized from `firebase-applet-config.json`, including a named database (`firestoreDatabaseId`).
- Real-time listeners (`onSnapshot`) subscribe to the signed-in user's tasks, Moodle courses, and settings.
- Writes use `setDoc`, `deleteDoc`, and batched `writeBatch`.
- Data is isolated per user under `/users/{userId}/...`.
- Authorization and field validation are enforced by `firestore.rules`.

### 4.3 Google Calendar REST API

Direct `fetch` calls from the browser, authorized with the in-memory OAuth bearer token:

- `GET /calendar/v3/calendars/primary/events` - import events for a time window
- `POST /calendar/v3/calendars/primary/events` - create an event
- `PUT /calendar/v3/calendars/primary/events/{eventId}` - update an event
- `DELETE /calendar/v3/calendars/primary/events/{eventId}` - delete an event

Events created by Calen are titled `[Calen] <task title>` and occupy one hour ending at the task deadline.

### 4.4 Moodle

Moodle support has two client-side paths:

1. **Demo/configured course sync** - built-in course and assignment data in `src/app.js` can be enabled per course.
2. **iCal feed import** - pastes `.ics` text, extracts `SUMMARY`, `DTEND`, and `DTSTART`, and creates Moodle-sourced tasks.

There is no direct Moodle web-service API client in this repository.

## 5. Dependency Inventory

### 5.1 Runtime Dependencies

| Package | Version | Actually used | Notes |
| :--- | :--- | :--- | :--- |
| `firebase` | ^13.1.0 | Yes | Auth, Firestore |
| `@tailwindcss/vite` | ^4.3.3 | Installed | Tailwind integration; UI uses custom CSS |
| `@vitejs/plugin-react` | ^6.1.1 | No | React plugin is not used by the vanilla entry point |
| `react` | ^19.0.1 | No | Not imported |
| `react-dom` | ^19.0.1 | No | Not imported |
| `lucide-react` | ^0.546.0 | No | Not imported; icons are SVG/assets |
| `motion` | ^12.23.24 | No | Not imported |
| `@google/genai` | ^2.4.0 | No | Declared for Gemini, not imported in current source |
| `express` | ^4.21.2 | No | No server entry point or start script |
| `dotenv` | ^17.2.3 | No | No server-side code loads it |
| `vite` | ^8.3.0 | Yes | Build and dev server |

### 5.2 Development Dependencies

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `tailwindcss` | ^4.3.3 | Tailwind tooling |
| `autoprefixer` | ^10.4.21 | PostCSS vendor prefixes (no PostCSS config present) |
| `esbuild` | ^0.25.0 | Bundler available; used transitively by Vite |
| `tsx` | ^4.21.0 | TypeScript execution helper; no `.ts` entry point |
| `typescript` | ^7.0.2 | Type checking tooling; source is JavaScript |
| `@types/node` | ^22.14.0 | Node type definitions |
| `@types/react` | ^19.3.0 | React type definitions (unused at runtime) |
| `@types/react-dom` | ^19.3.0 | React DOM type definitions (unused at runtime) |
| `@types/express` | ^4.17.21 | Express type definitions (unused at runtime) |

> The dependency list is broader than the current implementation. Before adding a feature, confirm whether a package is genuinely wired in rather than assuming it is available.

## 6. Testing and Quality Tools

| Task | Command | Notes |
| :--- | :--- | :--- |
| Unit tests | `node --test tests/deadlines.test.js` | Timezone-aware deadline grouping |
| Syntax lint | `npm run lint` | Runs `node --check` on `src/app.js` and `src/firebase.js` |
| Production build | `npm run build` | Outputs to `dist/` |
| Build preview | `npm run preview` | Serves the production build |
| Clean | `npm run clean` | Removes `dist/` and `server.js` |

There is no configured ESLint, Prettier, or TypeScript type-check script. The "lint" script is a JavaScript syntax check.

## 7. Configuration Files

| File | Purpose |
| :--- | :--- |
| `firebase-applet-config.json` | Firebase web app credentials, Firestore database ID, and OAuth client ID |
| `firestore.rules` | Firestore authorization and document validation |
| `firebase-blueprint.json` | Entity and collection schema reference |
| `metadata.json` | AI Studio applet metadata and declared capabilities |
| `.env.example` | Documented `GEMINI_API_KEY` and `APP_URL` variables for AI Studio |
| `vite.config.js` | Vite alias and server settings |
| `bun.lock` | Bun lockfile |
| `UI-DESIGN.md` | UI implementation notes and validation commands |

## 8. Known Tooling Constraints

- `npm install` may require `--legacy-peer-deps` due to an esbuild/Vite peer-version conflict noted in `UI-DESIGN.md`.
- React, Tailwind utilities, Express, TypeScript, `motion`, `lucide-react`, and `@google/genai` are not part of the running UI today. Removing them would require verifying tooling and build output.
- Node.js built-in tests are not exposed through an npm script; run them directly with `node --test`.
