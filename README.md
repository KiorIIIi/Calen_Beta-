# Calen — Unified Academic Planner & Task Hub

**Calen** is a minimalist, Notion-inspired academic task manager and calendar web application built with **HTML, CSS, Vanilla JavaScript, and Firebase Cloud Firestore**. It unifies student assignments, deadlines, and events across **Moodle LMS**, **Google Calendar**, **Google Classroom**, **Notion**, and **Trello** in a calm, distraction-free interface.

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
  - **Firebase Cloud Firestore Sync**: Sign in with Google to persist and sync tasks, course selections, and preferences across devices in real time.
  - **Offline-First & Instant Transfer Link**: Works immediately offline via `localStorage` and `BroadcastChannel`, with a shareable `#sync=` transfer link for quick device pairing without logging in.
  - **Appearance**: Switch between **Light Mode** (warm alabaster & soft pastels), **Dark Mode** (warm charcoal & muted pastels), and **System Auto**.

---

## Architecture & Project Structure

Calen uses a lightweight, zero-framework **HTML + CSS + Vanilla JavaScript (ES Modules)** architecture bundled with **Vite**:

```text
├── index.html                   # Semantic HTML layout, views, and modal dialogs
├── src/
│   ├── style.css                # Custom CSS variables (Light/Dark themes), typography & layout
│   ├── app.js                   # Application state, DOM rendering, Moodle iCal parser & UI events
│   └── firebase.js              # Firebase Auth, Cloud Firestore real-time sync & Google Calendar REST API
├── firebase-applet-config.json  # Firebase project & OAuth client configuration
├── firestore.rules              # Cloud Firestore security rules (strict per-user isolation)
├── firebase-blueprint.json      # Firestore schema blueprint
├── vite.config.js               # Vite dev server and build configuration
└── package.json                 # Dependencies and scripts
```

---

## Prerequisites

- **Node.js** `v18+` (or **Bun** `v1+`)
- **npm** (comes with Node.js)

---

## How to Run Locally

### 1. Clone or Download the Project

```bash
git clone <your-repo-url>
cd calen
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Local Development Server

```bash
npm run dev
```

Vite will start the development server on **http://localhost:3000**. Open that URL in your browser.

---

## Firebase & Google Calendar Setup (Optional for Custom Projects)

The app works out of the box using local storage (`localStorage`) even before signing in. To use **Firebase Cloud Firestore** and **Google Calendar Two-Way Sync** on your own machine or custom domain:

1. **Firebase Configuration (`firebase-applet-config.json`)**:
   - The root `firebase-applet-config.json` file holds the Firebase Web SDK configuration (`apiKey`, `authDomain`, `projectId`, `firestoreDatabaseId`, `appId`, `oAuthClientId`).
   - If you want to connect your own Firebase project, replace the values in `firebase-applet-config.json` with your Firebase web app credentials from **Firebase Console → Project Settings → General**.
2. **Enable Google Sign-In**:
   - In **Firebase Console → Authentication → Sign-in method**, enable the **Google** provider.
   - Under **Authentication → Settings → Authorized domains**, ensure `localhost` is listed so Google Sign-In popups work locally.
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
| `npm run lint` | Validates JavaScript syntax across `src/app.js` and `src/firebase.js` |
| `npm run clean` | Removes build artifacts (`dist/`) |
