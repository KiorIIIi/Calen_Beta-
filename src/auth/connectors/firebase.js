// Firebase Auth connector.
//
// Preferred connector when it is configured: it is the only one that yields a
// Firebase ID token, so Firestore cloud sync (and its security rules) work.
// The Google access token itself still lives only in memory.
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase-app.js';

const FALLBACK_TOKEN_LIFETIME_MS = 55 * 60 * 1000;

const UNAVAILABLE_CODES = new Set([
  'auth/operation-not-allowed',
  'auth/unauthorized-domain',
  'auth/invalid-api-key',
  'auth/configuration-not-found',
  'auth/argument-error'
]);

const CANCELLED_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

function mapFirebaseError(err) {
  const code = err?.code || 'auth/unknown';
  if (CANCELLED_CODES.has(code)) {
    return { code: 'cancelled', message: 'Google sign-in was cancelled.' };
  }
  if (UNAVAILABLE_CODES.has(code)) {
    return {
      code: 'unavailable',
      message:
        'Firebase Google sign-in is not enabled for this domain. Enable the Google provider in the Firebase console, or use the browser OAuth connector.'
    };
  }
  if (code === 'auth/popup-blocked') {
    return {
      code: 'unavailable',
      message: 'The sign-in popup was blocked by the browser. Allow popups for this site and retry.'
    };
  }
  if (code === 'auth/network-request-failed') {
    return { code: 'network', message: 'Network error while contacting Google. Check your connection.' };
  }
  return { code: 'failed', message: err?.message || 'Firebase sign-in failed.' };
}

function buildProvider(scopes = []) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  scopes.forEach((scope) => {
    const value = String(scope || '').trim();
    if (value && !['openid', 'email', 'profile'].includes(value)) provider.addScope(value);
  });
  return provider;
}

export const firebaseConnector = {
  id: 'firebase',
  label: 'Google via Firebase',

  isSupported() {
    return Boolean(auth);
  },

  async prepare() {
    return this.isSupported();
  },

  async signIn({ scopes = [] } = {}) {
    const result = await signInWithPopup(auth, buildProvider(scopes)).catch((err) => {
      throw mapFirebaseError(err);
    });
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw {
        code: 'failed',
        message: 'Google did not return an access token. Remove Calen from your Google account permissions and retry.'
      };
    }
    return {
      accessToken: credential.accessToken,
      // Firebase does not expose the Google token lifetime; Google access
      // tokens are valid for one hour, so assume the conservative default.
      expiresAt: Date.now() + FALLBACK_TOKEN_LIFETIME_MS,
      scopes: credential.scope ? String(credential.scope).split(' ') : scopes,
      user: {
        uid: result.user?.uid,
        email: result.user?.email,
        displayName: result.user?.displayName,
        photoURL: result.user?.photoURL,
        emailVerified: result.user?.emailVerified
      },
      cloudUser: result.user || null
    };
  },

  // The Firebase SDK restores its own user on reload; the Google access token
  // is deliberately not persisted, so a reload needs an explicit reconnect.
  async refresh() {
    return null;
  },

  onAuthStateChanged(callback) {
    if (!this.isSupported()) return () => {};
    return onAuthStateChanged(auth, (user) => callback(user));
  },

  async signOut() {
    if (!this.isSupported()) return;
    await signOut(auth).catch(() => {});
  }
};
