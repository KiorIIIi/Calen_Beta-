import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Google Workspace OAuth Scopes
export const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory access token cache (never stored in localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken = null;

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
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function googleSignIn() {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

export const loginWithGoogle = googleSignIn;

export async function getAccessToken() {
  return cachedAccessToken;
}

export async function logoutUser() {
  await auth.signOut();
  cachedAccessToken = null;
}

export function initAuth(onAuthSuccess, onAuthFailure, onUserChanged) {
  return onAuthStateChanged(auth, async (user) => {
    if (onUserChanged) onUserChanged(user);
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure(user);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure(null);
    }
  });
}

export function subscribeAuth(callback) {
  return initAuth(
    (user) => callback(user, cachedAccessToken),
    (user) => callback(user, null)
  );
}

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
    cachedAccessToken = null;
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
    cachedAccessToken = null;
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
    cachedAccessToken = null;
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
    const batch = writeBatch(db);
    courses.forEach((c) => {
      batch.set(doc(db, basePath, c.id), { ...c, uid });
    });
    await batch.commit();
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
    const batch = writeBatch(db);
    tasks.forEach((t) => {
      const clean = { ...t, uid };
      Object.keys(clean).forEach((k) => {
        if (clean[k] === undefined) delete clean[k];
      });
      batch.set(doc(db, `users/${uid}/tasks`, t.id), clean);
    });
    courses.forEach((c) => {
      batch.set(doc(db, basePathOrCourses(uid), c.id), { ...c, uid });
    });
    if (settings) {
      batch.set(doc(db, `users/${uid}/settings/preferences`), { ...settings, uid });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

function basePathOrCourses(uid) {
  return `users/${uid}/moodle_courses`;
}
