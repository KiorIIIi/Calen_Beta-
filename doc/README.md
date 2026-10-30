# Calen Documentation

Documentation for **Calen**, a Notion-inspired academic planner and unified deadline hub.

This folder is the reference for how the project is built, how its pieces fit together, and what data it stores. Keep these documents updated when the implementation changes.

## Documents

| Document | Purpose |
| :--- | :--- |
| [TECH-STACK.md](./TECH-STACK.md) | Languages, frameworks, libraries, tooling, and dependency inventory |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System structure, modules, state management, data flow, integrations, and extension points |
| [DATA-MODEL.md](./DATA-MODEL.md) | Task/course/settings schemas, local storage keys, Firestore paths, and security rules |
| [MERGE-REVIEW-2026-10-30.md](./MERGE-REVIEW-2026-10-30.md) | Core conflict decisions and verification for integrating development into main |

## Project Summary

Calen is a vanilla-JavaScript academic planner with browser-local storage and a shared local JSON workspace. The Vite configuration supplies workspace reads/writes, SSE updates, an iCalendar feed, and upstream Moodle/Classroom/iCal proxies. Firebase and Google Calendar helpers remain available in source; Google popup login is currently disabled. Notion and Trello remain task sources rather than live API clients. See the current root README and the merge review above when older architecture descriptions differ from the implementation.

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
