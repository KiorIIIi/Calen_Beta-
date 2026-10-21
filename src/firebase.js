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
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
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

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

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
      batch.set(doc(db, `users/${uid}/moodle_courses`, c.id), { ...c, uid });
    });
    if (settings) {
      batch.set(doc(db, `users/${uid}/settings/preferences`), { ...settings, uid });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}
