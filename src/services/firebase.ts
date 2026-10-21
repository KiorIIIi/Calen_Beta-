import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInAnonymously,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocFromServer,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, IntegrationSettings } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, using local storage cache.');
    }
    return false;
  }
}

// Auth methods
const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<User | null> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (err) {
    console.warn('Google sign-in popup fallback, trying anonymous session:', err);
    const anon = await signInAnonymously(auth);
    return anon.user;
  }
}

export async function loginAnonymously(): Promise<User | null> {
  try {
    const res = await signInAnonymously(auth);
    return res.user;
  } catch (err) {
    console.error('Anonymous sign-in failed:', err);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Firestore Realtime Task Listeners
export function subscribeToUserTasks(
  userId: string,
  onTasks: (tasks: Task[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${userId}/tasks`;
  const tasksRef = collection(db, 'users', userId, 'tasks');

  return onSnapshot(
    tasksRef,
    (snapshot) => {
      const items: Task[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: data.id || docSnap.id,
          title: data.title || '',
          description: data.description,
          dueDate: data.dueDate,
          source: data.source,
          courseName: data.courseName,
          courseCode: data.courseCode,
          moduleName: data.moduleName,
          externalUrl: data.externalUrl,
          status: data.status,
          priority: data.priority,
          estimatedMinutes: data.estimatedMinutes,
          completedAt: data.completedAt,
          checklist: data.checklist || [],
          notes: data.notes || '',
          tags: data.tags || [],
        });
      });
      onTasks(items);
    },
    (error) => {
      console.warn('Tasks onSnapshot listener error:', error.message);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Save single task to Firestore
export async function saveTaskToFirestore(userId: string, task: Task): Promise<void> {
  const path = `users/${userId}/tasks/${task.id}`;
  try {
    const taskDocRef = doc(db, 'users', userId, 'tasks', task.id);
    await setDoc(taskDocRef, {
      ...task,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete task from Firestore
export async function deleteTaskFromFirestore(userId: string, taskId: string): Promise<void> {
  const path = `users/${userId}/tasks/${taskId}`;
  try {
    const taskDocRef = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(taskDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Save settings to Firestore
export async function saveSettingsToFirestore(userId: string, settings: IntegrationSettings): Promise<void> {
  const path = `users/${userId}/settings/config`;
  try {
    const settingsDocRef = doc(db, 'users', userId, 'settings', 'config');
    await setDoc(settingsDocRef, {
      ...settings,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Subscribe to User Settings
export function subscribeToUserSettings(
  userId: string,
  onSettings: (settings: IntegrationSettings) => void
): Unsubscribe {
  const path = `users/${userId}/settings/config`;
  const settingsDocRef = doc(db, 'users', userId, 'settings', 'config');

  return onSnapshot(
    settingsDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as IntegrationSettings;
        onSettings(data);
      }
    },
    (error) => {
      console.warn('Settings onSnapshot error:', error.message);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
