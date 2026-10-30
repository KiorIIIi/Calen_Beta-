# Calen Data Model

This document defines the entities, storage keys, Firestore paths, identifiers, and validation rules used by Calen.

## 1. Storage Overview

| Store | Scope | Data |
| :--- | :--- | :--- |
| `localStorage` | One browser profile | Tasks, Moodle courses, settings |
| Cloud Firestore | One signed-in Google user across devices | Tasks, Moodle courses, settings |
| Google Calendar | User's primary calendar | Exported tasks as events |
| URL fragment | Manual transfer | Base64-encoded task list |

Local storage is always the immediate source of truth for rendering. Firestore is an optional cloud mirror and cross-device sync source.

## 2. Local Storage Keys

| Constant | Key | Value |
| :--- | :--- | :--- |
| `STORAGE_KEYS.TASKS` | `calen_html_tasks_v2` | JSON array of Task objects |
| `STORAGE_KEYS.COURSES` | `calen_html_moodle_courses_v2` | JSON array of MoodleCourse objects |
| `STORAGE_KEYS.SETTINGS` | `calen_html_settings_v2` | JSON Settings object |

The `_v2` suffix is a manual schema version marker. There is no migration framework; corrupt JSON falls back to built-in demo data and defaults.

## 3. Firestore Layout

```text
/users/{userId}/tasks/{taskId}              -> Task
/users/{userId}/moodle_courses/{courseId}   -> MoodleCourse
/users/{userId}/settings/preferences        -> UserSettings
/test/connection                            -> connectivity probe (read-only)
```

- `{userId}` is the Firebase Authentication UID.
- Task document IDs equal `task.id`.
- Moodle course document IDs equal `course.id`.
- The settings document uses the fixed ID `preferences`.
- Every user document stores `uid` so rules can verify ownership.

## 4. Task Entity

Defined in `firebase-blueprint.json` and used throughout `src/app.js`.

### 4.1 Fields

| Field | Type | Required | Notes |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | Unique task identifier, max 128 characters in rules |
| `uid` | string | Yes in cloud | Owner UID; must equal the Firestore path user |
| `title` | string | Yes | 1-400 characters in Firestore rules |
| `priority` | string enum | Yes | `low`, `medium`, `high`, `urgent` |
| `status` | string enum | Yes | `todo`, `in_progress`, `completed` |
| `source` | string enum | Yes | `moodle`, `google_classroom`, `google_calendar`, `notion`, `trello`, `personal` |
| `course` | string | No | Free-text course or project label |
| `dueDate` | string | Yes in cloud | ISO 8601 timestamp, max 64 characters |
| `description` | string | No | Free-text notes |
| `gcalEventId` | string | No | Google Calendar event ID when linked |
| `subtasks` | array | No | Checklist items; not validated by Firestore rules |

Firestore rules additionally accept the source value `classroom`. `firebase-blueprint.json` lists only `google_classroom`. Keep these two definitions aligned when changing sources.

### 4.2 Priority semantics

| Value | Label | Sort weight |
| :--- | :--- | :--- |
| `urgent` | Urgent | 4 |
| `high` | High | 3 |
| `medium` | Medium | 2 |
| `low` | Low | 1 |

### 4.3 Status semantics

| Value | Label | Kanban column |
| :--- | :--- | :--- |
| `todo` | To Do | To Do |
| `in_progress` | In Progress | In Progress |
| `completed` | Completed | Completed |

Completed tasks sort last and are grouped separately by the deadline renderer.

### 4.4 Subtask shape

```json
{
  "id": "sub-1729700000000",
  "title": "Review lecture notes",
  "completed": false
}
```

Subtasks are embedded in the task document. The UI isolates edits in `state.draftSubtasks` until the task form is submitted.

### 4.5 Example task

```json
{
  "id": "task-1729700000000",
  "uid": "firebase-user-uid",
  "title": "Problem Set 4: Neural Networks",
  "priority": "urgent",
  "status": "in_progress",
  "source": "moodle",
  "course": "CS 189",
  "dueDate": "2026-10-24T07:59:00.000Z",
  "description": "Submit PDF and notebook via Moodle.",
  "gcalEventId": "abc123def456",
  "subtasks": [
    { "id": "s1", "title": "Derive gradients", "completed": true },
    { "id": "s2", "title": "Upload to Moodle", "completed": false }
  ]
}
```

## 5. MoodleCourse Entity

### 5.1 Fields

| Field | Type | Required in cloud | Notes |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | Document ID, max 128 characters |
| `uid` | string | Yes | Owner UID |
| `code` | string | Yes per blueprint | Short course code, e.g. `CS 189` |
| `name` | string | Yes per blueprint | Course title |
| `synced` | boolean | Yes per blueprint | Whether assignments are merged into tasks |
| `instructor` | string | No | Display metadata |
| `term` | string | No | Display metadata |
| `assignments` | Task[] | No | Embedded assignment templates |

The deployed rules only require a valid document ID and a matching `uid` for courses; they do not enforce `code`, `name`, `synced`, or the assignment shape. The blueprint is stricter than the rules.

### 5.2 Example course

```json
{
  "id": "moodle-cs189",
  "uid": "firebase-user-uid",
  "code": "CS 189",
  "name": "Introduction to Machine Learning",
  "instructor": "Prof. J. Shewchuk",
  "term": "Fall Semester",
  "synced": true,
  "assignments": [
    {
      "id": "mdl-task-cs189-1",
      "title": "Problem Set 4",
      "priority": "urgent",
      "status": "in_progress",
      "source": "moodle",
      "course": "CS 189",
      "dueDate": "2026-10-24T07:59:00.000Z",
      "description": "Moodle dropbox submission.",
      "subtasks": []
    }
  ]
}
```

When a course is enabled and saved, its `assignments` are merged into the top-level task list by task ID. Existing task edits win over the embedded template.

## 6. UserSettings Entity

### 6.1 Fields

| Field | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `uid` | string | - | Added on cloud writes |
| `theme` | string enum | `dark` | `light`, `dark`, `system` |
| `platforms` | object | all `true` | Visibility toggles for each source |

`platforms` keys:

```text
moodle
google_calendar
google_classroom
notion
trello
```

`personal` tasks are not toggleable and are always visible.

### 6.2 Example settings

```json
{
  "uid": "firebase-user-uid",
  "theme": "system",
  "platforms": {
    "moodle": true,
    "google_calendar": true,
    "google_classroom": false,
    "notion": true,
    "trello": true
  }
}
```

The blueprint only declares `uid` and `theme`; `platforms` exists in the implementation and is written to `settings/preferences`. Rules do not validate individual settings fields.

## 7. Identifier Conventions

| Prefix/pattern | Source | Example |
| :--- | :--- | :--- |
| `task-<timestamp>` | Manual or quick-add task | `task-1729700000000` |
| `task-gc-*` | Built-in Google Classroom demo tasks | `task-gc-1` |
| `task-tr-*` | Built-in Trello demo tasks | `task-tr-1` |
| `task-nt-*` | Built-in Notion demo tasks | `task-nt-1` |
| `task-pr-*` | Built-in personal demo tasks | `task-pr-1` |
| `mdl-task-*` | Built-in Moodle assignments | `mdl-task-cs189-1` |
| `mdl-ical-<timestamp>-<index>` | Moodle iCal import | `mdl-ical-1729700000000-0` |
| `gcal-<eventId prefix>` | Google Calendar import | `gcal-abc123...` |
| `sub-<timestamp>` | Checklist subtask | `sub-1729700000000` |
| `*gcalEventId` | Google Calendar event link | Google-generated ID |

Collision avoidance relies on timestamps for user-created IDs. There is no UUID library.

## 8. Date and Time Semantics

- `dueDate` is stored as a JavaScript ISO string (`toISOString()`), normally UTC (`...Z`).
- Deadline grouping (`groupByDeadline`) and most displayed deadline labels use the `Asia/Manila` timezone.
- The calendar grid groups tasks by the browser's local date methods, which can differ from the `Asia/Manila` grouping near midnight.
- New tasks default to `23:59` local time on the selected date.
- Imported Google Calendar events use the event end time as the deadline; the exported event starts one hour before the deadline.
- Moodle iCal timestamps are converted from `YYYYMMDDTHHMMSSZ` to ISO.

## 9. Relationships and Invariants

1. A user owns exactly one settings document at `settings/preferences`.
2. `task.id` must equal the Firestore document ID.
3. `course.id` must equal the Firestore document ID.
4. `uid` on every cloud document must match the authenticated user and the path segment.
5. A task links to at most one Google Calendar event via `gcalEventId`.
6. Google Calendar imports match existing tasks by `gcalEventId` first, then by `id === "gcal-" + eventId`.
7. A task's `source` determines its badge and default filter visibility.
8. Completed tasks remain in storage; they are hidden or grouped, not deleted.
9. Embedded `assignments` in Moodle courses are templates, not references; merging copies them into `state.tasks`.
10. Cloud task writes must have a string `dueDate` and a valid non-empty title, or `firestore.rules` rejects them.

## 10. Validation Sources

| Artifact | Enforces |
| :--- | :--- |
| `firestore.rules` | Authentication, ownership, ID length, task title/date/source/status/priority/uid, course uid |
| `firebase-blueprint.json` | Documented entity shape and required properties |
| `src/app.js` | Runtime defaults, filtering, grouping, and UI-level constraints |
| `src/deadlines.js` | Date parsing and deadline bucket assignment |

When changing a persisted field, update all applicable artifacts:

1. `src/app.js` create/update paths
2. `src/firebase.js` write/read helpers
3. `firestore.rules` validation
4. `firebase-blueprint.json` schema
5. This document
