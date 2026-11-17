// Firebase SDK bootstrap shared by the auth connectors and the Firestore /
// Google Calendar helpers. Keeping it in its own module prevents a circular
// import (auth -> firebase -> auth) now that sign-in lives in src/auth.
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps()[0] || initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const firebaseConfigPublic = {
  projectId: firebaseConfig.projectId || '',
  authDomain: firebaseConfig.authDomain || '',
  oAuthClientId: firebaseConfig.oAuthClientId || ''
};
