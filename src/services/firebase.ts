import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
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
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
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
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
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
      console.warn('Please check your Firebase configuration.');
    }
    return false;
  }
}

// Auth methods (Google Sign-In only, as provisioned by Firebase)
const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<User | null> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (err) {
    console.warn('Google sign-in popup closed or cancelled:', err);
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
    // Clean undefined fields before saving to Firestore
    const cleanTask: Record<string, unknown> = {
      id: task.id,
      title: task.title.slice(0, 300),
      dueDate: task.dueDate,
      source: task.source,
      status: task.status,
      priority: task.priority,
      userId,
      updatedAt: new Date().toISOString(),
    };
    if (task.description !== undefined) cleanTask.description = task.description.slice(0, 2000);
    if (task.courseName !== undefined) cleanTask.courseName = task.courseName.slice(0, 200);
    if (task.courseCode !== undefined) cleanTask.courseCode = task.courseCode.slice(0, 50);
    if (task.moduleName !== undefined) cleanTask.moduleName = task.moduleName.slice(0, 200);
    if (task.externalUrl !== undefined) cleanTask.externalUrl = task.externalUrl.slice(0, 1000);
    if (task.estimatedMinutes !== undefined) cleanTask.estimatedMinutes = task.estimatedMinutes;
    if (task.completedAt !== undefined) cleanTask.completedAt = task.completedAt;
    if (task.checklist !== undefined) cleanTask.checklist = task.checklist;
    if (task.notes !== undefined) cleanTask.notes = task.notes.slice(0, 5000);
    if (task.tags !== undefined) cleanTask.tags = task.tags;

    await setDoc(taskDocRef, cleanTask);
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
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
