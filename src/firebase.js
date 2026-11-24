import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase-app.js';
import { getAccessToken, invalidateAccessToken } from './auth/index.js';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write'
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((p) => ({
          providerId: p.providerId,
          displayName: p.displayName,
          email: p.email,
          photoUrl: p.photoURL
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(errInfo.error || `Firestore ${operationType} failed at ${path}`);
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.warn('Firestore offline — using Local Server + LocalStorage sync.');
    }
  }
}
// Only probe when a Firebase user was already restored from persistence: an
// anonymous page load would otherwise open a Firestore listen stream and log a
// transport warning on every visit. Signed-in sessions exercise the connection
// through their real listeners.
if (auth.currentUser) testConnection();

// ============================================================================
// GOOGLE CALENDAR REST API HELPERS
// ============================================================================
export async function fetchGoogleCalendarEvents(daysAhead = 30) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('NEEDS_AUTH');
  }

  const now = new Date();
  const past = new Date(now);
  past.setDate(now.getDate() - 7);
  const future = new Date(now);
  future.setDate(now.getDate() + daysAhead);

  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
    timeMin: past.toISOString(),
    timeMax: future.toISOString()
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (res.status === 401 || res.status === 403) {
    invalidateAccessToken();
    throw new Error('NEEDS_AUTH');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to fetch Google Calendar events');
  }

  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

export async function upsertGoogleCalendarEvent(task) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('NEEDS_AUTH');
  }

  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) {
    throw new Error('This assignment has no valid deadline, so it cannot be synced to Google Calendar.');
  }
  const start = new Date(due.getTime() - 60 * 60 * 1000); // 1 hour block ending at deadline

  const body = {
    summary: `[Calen] ${task.title}`,
    description: `${task.description || ''}\n\nPriority: ${(task.priority || 'medium').toUpperCase()}\nSource: ${task.course || task.source}`,
    start: { dateTime: start.toISOString() },
    end: { dateTime: due.toISOString() }
  };

  const hasExistingId = Boolean(task.gcalEventId);
  const url = hasExistingId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
        task.gcalEventId
      )}`
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  const res = await fetch(url, {
    method: hasExistingId ? 'PUT' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (res.status === 401 || res.status === 403) {
    invalidateAccessToken();
    throw new Error('NEEDS_AUTH');
  }

  // If event was deleted on Google Calendar, fallback to POST
  if (hasExistingId && res.status === 404) {
    const fallbackRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );
    if (!fallbackRes.ok) {
      throw new Error('Failed to create Google Calendar event');
    }
    return await fallbackRes.json();
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Failed to sync event to Google Calendar');
  }

  return await res.json();
}

export async function deleteGoogleCalendarEvent(gcalEventId) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('NEEDS_AUTH');
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      gcalEventId
    )}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (res.status === 401 || res.status === 403) {
    invalidateAccessToken();
    throw new Error('NEEDS_AUTH');
  }

  return res.ok || res.status === 404;
}

// ============================================================================
// FIRESTORE HELPERS
// ============================================================================
export function subscribeUserWorkspace(uid, { onTasks, onMoodleCourses, onSettings }) {
  const tasksPath = `users/${uid}/tasks`;
  const coursesPath = `users/${uid}/moodle_courses`;
  const settingsPath = `users/${uid}/settings/preferences`;

  const unsubTasks = onSnapshot(
    collection(db, tasksPath),
    (snapshot) => {
      const tasks = snapshot.docs.map((d) => d.data());
      onTasks(tasks, snapshot.empty);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, tasksPath)
  );

  const unsubCourses = onSnapshot(
    collection(db, coursesPath),
    (snapshot) => {
      const courses = snapshot.docs.map((d) => d.data());
      onMoodleCourses(courses, snapshot.empty);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, coursesPath)
  );

  const unsubSettings = onSnapshot(
    doc(db, settingsPath),
    (snapshot) => {
      if (snapshot.exists()) {
        onSettings(snapshot.data());
      }
    },
    (err) => handleFirestoreError(err, OperationType.GET, settingsPath)
  );

  return () => {
    unsubTasks();
    unsubCourses();
    unsubSettings();
  };
}

export async function saveTaskToFirestore(uid, task) {
  const path = `users/${uid}/tasks/${task.id}`;
  try {
    // Preserve optional task.color together with the other task fields.
    const payload = { ...task, uid };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });
    await setDoc(doc(db, `users/${uid}/tasks`, task.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteTaskFromFirestore(uid, taskId) {
  const path = `users/${uid}/tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, `users/${uid}/tasks`, taskId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveMoodleCoursesToFirestore(uid, courses) {
  const basePath = `users/${uid}/moodle_courses`;
  try {
    const courseIds = new Set(courses.map((c) => c.id));
    // Remove cloud docs for courses the user deleted locally so the empty /
    // trimmed course list is mirrored in Firestore instead of growing stale.
    const existing = await getDocs(collection(db, basePath));
    const staleIds = existing.docs.map((d) => d.id).filter((id) => !courseIds.has(id));
    const chunkSize = 450;
    for (let i = 0; i < courses.length; i += chunkSize) {
      const batch = writeBatch(db);
      courses.slice(i, i + chunkSize).forEach((c) => {
        batch.set(doc(db, basePath, c.id), { ...c, uid });
      });
      await batch.commit();
    }
    for (let i = 0; i < staleIds.length; i += chunkSize) {
      const batch = writeBatch(db);
      staleIds.slice(i, i + chunkSize).forEach((id) => {
        batch.delete(doc(db, basePath, id));
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, basePath);
  }
}

export async function saveSettingsToFirestore(uid, settings) {
  const path = `users/${uid}/settings/preferences`;
  try {
    await setDoc(doc(db, path), { ...settings, uid });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function seedWorkspaceToFirestore(uid, tasks, courses, settings) {
  try {
    const chunkSize = 450; // Firestore batches cap at 500 writes
    const items = [
      ...tasks.map((t) => ({ path: `users/${uid}/tasks`, id: t.id, data: t })),
      ...courses.map((c) => ({ path: basePathOrCourses(uid), id: c.id, data: c })),
    ];
    for (let i = 0; i < items.length; i += chunkSize) {
      const batch = writeBatch(db);
      items.slice(i, i + chunkSize).forEach(({ path, id, data }) => {
        const clean = { ...data, uid };
        Object.keys(clean).forEach((k) => {
          if (clean[k] === undefined) delete clean[k];
        });
        batch.set(doc(db, path, id), clean);
      });
      await batch.commit();
    }
    if (settings) {
      await setDoc(doc(db, `users/${uid}/settings/preferences`), { ...settings, uid });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

function basePathOrCourses(uid) {
  return `users/${uid}/moodle_courses`;
}
