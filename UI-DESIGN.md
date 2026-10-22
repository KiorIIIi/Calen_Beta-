# UI implementation reference

The initial workspace implementation follows the desktop Tasks (3:2) and mobile Tasks (3:128) frames in [CALEN UI Design Draft](https://www.figma.com/design/HjvgsKPbQpTGpRHpw59n0m?node-id=3-2).

Use Figma for navigation and deadline-list composition. Use the CSS variables from `main` for the warm alabaster, charcoal, and semantic pastel palette, including dark mode. Retain the existing Fraunces and Plus Jakarta Sans typography.

Implemented: desktop sidebar, mobile bottom navigation, collapsible sidebar, source and course filters, deadline groups, completed-task disclosure, and keyboard dialog navigation. Existing table, priority, platform, and board layouts remain under View options & priority. Existing calendar and settings functionality is retained; their full Figma screen redesigns are not included in this first pass.

Deadline groups and the task heading use Asia/Manila. Completing a task updates the existing app task state; it does not submit an assignment to its source platform. Source navigation filters stored tasks and does not imply a live connection. Account text reflects the actual signed-in user or local storage mode.

Validation: `npm run build`, `npm run lint`, and `node --test tests/deadlines.test.js`. The existing package manifest has an esbuild/Vite peer-version conflict; local setup currently requires `npm install --legacy-peer-deps`. No dependency versions were changed for this UI pass.
