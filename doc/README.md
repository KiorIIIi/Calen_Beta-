# Calen Documentation

Documentation for **Calen**, a Notion-inspired academic planner and unified deadline hub.

This folder is the reference for how the project is built, how its pieces fit together, and what data it stores. Keep these documents updated when the implementation changes.

## Documents

| Document | Purpose |
| :--- | :--- |
| [TECH-STACK.md](./TECH-STACK.md) | Languages, frameworks, libraries, tooling, and dependency inventory |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System structure, modules, state management, data flow, integrations, and extension points |
| [DATA-MODEL.md](./DATA-MODEL.md) | Task/course/settings schemas, local storage keys, Firestore paths, and security rules |

## Project Summary

Calen is a client-side, offline-first web application that unifies academic deadlines from Moodle, Google Classroom, Google Calendar, Notion, and Trello into one task list and calendar. It has no custom application server: the browser talks directly to local storage, Firebase Auth, Cloud Firestore, and the Google Calendar REST API.

## Quick Facts

| Item | Value |
| :--- | :--- |
| Application type | Single-page web application |
| Frontend approach | Vanilla JavaScript ES modules + HTML + hand-written CSS |
| Build tool | Vite |
| Cloud backend | Firebase (Authentication + Cloud Firestore) |
| External API | Google Calendar REST API v3 |
| Default dev URL | `http://localhost:3000` |
| Timezone baseline | `Asia/Manila` |
| Package manager | npm or Bun (`bun.lock` is present) |
| Test runner | Node.js built-in `node:test` |

## Source of Truth

The documents describe the code as of **2026-10-23**. When behavior and documentation disagree, treat the source files as authoritative and update the affected document:

- `index.html` - static layout, views, and dialogs
- `src/app.js` - application state, rendering, events, and feature logic
- `src/firebase.js` - Firebase Auth, Firestore, and Google Calendar API access
- `src/deadlines.js` - timezone-aware deadline grouping
- `src/style.css` - theme tokens, layout, and component styling
- `firestore.rules` - deployed Firestore authorization and validation rules
- `firebase-blueprint.json` - Firestore entity schema blueprint
