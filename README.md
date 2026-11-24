# Calen — Unified Academic Planner & Task Hub

**Calen** is an academic planner built with HTML, CSS, vanilla JavaScript and Vite. Students organize assignments, deadlines and events in one task list and calendar. The `codex/development` branch includes browser storage, a shared JSON workspace served by Vite, Moodle and Google Classroom import routes, and iCalendar import/export. Notion and Trello are source labels, not live integrations.

Active development branch: **`codex/development`**. The instructions below describe this branch.

---

## Key Features

- **Master Task List (4 Layouts)**:
  - Switch seamlessly between **Table**, **By Priority**, **By Platform**, and **Kanban Board** views.
  - Interactive **Priority Focus** filter bar (`Urgent`, `High`, `Medium`, `Low`) with soft pastel badges.
  - Click any priority or status badge directly in the table to cycle its state in real time.
  - Inline Quick-Add bar, full-text search, platform filtering, and checklist subtasks.
- **Calendar View (Month & Week)**:
  - Visualize deadlines by course and platform in **Month** or **Week** grid layouts.
  - Click any date cell to schedule an assignment on that date, or click an event chip to inspect details.
- **Unified Settings & Integrations Hub**:
  - **Google Calendar Two-Way Sync**: Import upcoming events (next 30 days) from your primary Google Calendar and push pending Calen deadlines back to Google Calendar with explicit confirmation dialogs.
  - **Moodle LMS Sync**: Select enrolled Moodle courses to sync module deadlines, or paste/import Moodle iCal (`.ics`) calendar feeds.
  - **Firebase Cloud Firestore Sync**: Firebase Auth and Firestore helpers support cloud persistence; popup Google sign-in is currently disabled on this branch (see runtime notes below).
  - **Offline-First & Instant Transfer Link**: Works immediately offline via `localStorage` and `BroadcastChannel`, with a shareable `#sync=` transfer link for quick device pairing without logging in.
  - **Appearance**: Switch between **Light Mode** (warm alabaster & soft pastels), **Dark Mode** (warm charcoal & muted pastels), and **System Auto**.

---

## Architecture & Project Structure

Calen uses **HTML + CSS + Vanilla JavaScript (ES Modules)** with Vite middleware for the branch's local workspace and import APIs:

```text
├── index.html                   # Semantic HTML layout, views, and modal dialogs
├── src/
│   ├── style.css                # Custom CSS variables (Light/Dark themes), typography & layout
│   ├── app.js                   # Application state, DOM rendering, Moodle iCal parser & UI events
│   └── firebase.js              # Firebase Auth, Cloud Firestore real-time sync & Google Calendar REST API
├── firebase-applet-config.json  # Firebase project & OAuth client configuration
├── firestore.rules              # Cloud Firestore security rules (strict per-user isolation)
├── firebase-blueprint.json      # Firestore schema blueprint
├── vite.config.js               # Vite configuration, shared workspace API and import proxies
└── package.json                 # Dependencies and scripts
```

---

## Prerequisites

- **Node.js** `20.19+` or `22.12+` (required by Vite 8)
- **npm** (comes with Node.js)

---

## How to Run Locally

### 1. Clone or Download the Project

```bash
git clone --branch codex/development https://github.com/KiorIIIi/Calen_Beta-.git
cd Calen_Beta-
```

### 2. Install Dependencies

```bash
npm install
```

If npm reports the documented Vite/esbuild peer dependency conflict, retry with `npm install --legacy-peer-deps`.

### 3. Start the Local Development Server

```bash
npm run dev
```

Vite will start the development server on **http://localhost:3000**. Open that URL in your browser.

---

## Branch runtime and integrations

- Vite serves `/api/workspace`, `/api/events`, `/api/calendar.ics` and import proxies in both development and preview mode. Shared workspace data is written to `data/workspace-db.json`; preserve it when updating an existing installation.
- Browser storage and cross-tab updates remain available. The server workspace is shared across clients of the same running instance; it is not an authenticated per-user database.
- Sign-in lives in `src/auth/` and is connector-based: Google via Firebase Auth, with a Google Identity Services token client as fallback. The app reads the enabled connectors from `GET /api/auth/providers`; no provider code or client secret is hardcoded in `src/app.js`. Details: [doc/AUTH.md](doc/AUTH.md).
- Google access tokens remain memory-only. Firebase sign-in restores the cloud identity after a reload (enabling Firestore sync), but Calendar/Classroom API calls need a reconnect. The Calendar and Classroom dialogs also accept pasted access tokens for testing.
- Moodle supports REST-token imports and iCalendar feeds. Classroom supports access-token imports and iCalendar feeds. Actual access depends on the upstream account permissions and API configuration.
- `npm run build` produces `dist/`. Static hosting alone does not provide the Vite API routes. For local build review, run `npm run preview`; this also loads the workspace middleware.
- The workspace and proxy routes have no application authentication. Keep this development runtime on a trusted network. Publishing a tunnel exposes the shared workspace and import routes.

## Firebase & Google Calendar Setup (Optional for Custom Projects)

The app works out of the box using local storage (`localStorage`) even before signing in. To use **Firebase Cloud Firestore** and **Google Calendar Two-Way Sync** on your own machine or custom domain:

1. **Firebase Configuration (`firebase-applet-config.json`)**:
   - The root `firebase-applet-config.json` file holds the Firebase Web SDK configuration (`apiKey`, `authDomain`, `projectId`, `firestoreDatabaseId`, `appId`, `oAuthClientId`).
   - If you want to connect your own Firebase project, replace the values in `firebase-applet-config.json` with your Firebase web app credentials from **Firebase Console → Project Settings → General**.
2. **Enable Google Sign-In** (one of two connectors is enough):
   - *Firebase connector*: in **Firebase Console → Authentication → Sign-in method**, enable the **Google** provider, and add `localhost` / your domain under **Authentication → Settings → Authorized domains**. This connector also provides the Firestore identity.
   - *Browser OAuth connector*: in **Google Cloud Console → APIs & Services → Credentials**, open the OAuth client and add your app origin (for example `http://localhost:3000`) under **Authorized JavaScript origins**. It needs no client secret.
   - Choose the order with the `CALEN_AUTH_CONNECTORS` env var (default `firebase,google-gis`).
3. **Google Calendar API**:
   - In the **Google Cloud Console** for the same project, enable the **Google Calendar API** under **APIs & Services → Library**.
   - Ensure the OAuth consent screen allows the `https://www.googleapis.com/auth/calendar.events` scope.
4. **Firestore Security Rules**:
   - Deploy the included `firestore.rules` to your Firestore database so each signed-in user can read and write their own `/users/{userId}/tasks`, `/users/{userId}/moodle_courses`, and `/users/{userId}/settings` documents.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite local development server at `http://localhost:3000` |
| `npm run build` | Bundles the production HTML, CSS, and JS into the `dist/` folder |
| `npm run preview` | Locally previews the production build from `dist/` |
| `npm run lint` | Syntax-checks the app, auth module, Firebase helpers and Vite config |
| `npm run clean` | Removes build artifacts (`dist/`) |
| `node --test tests/auth.test.js tests/deadlines.test.js` | Unit tests (session reducer + deadline grouping) |
