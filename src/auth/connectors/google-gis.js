// Browser OAuth connector (Google Identity Services).
//
// Fallback when Firebase Auth is not usable (provider disabled, popup blocked,
// or a deployment without Firebase). It talks to Google's own OAuth endpoint
// with the public client id only — no client secret ever reaches the browser —
// and Calen's API verifies the resulting token before it is trusted.
import { IDENTITY_SCOPES } from '../scopes.js';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const INTERACTIVE_TIMEOUT_MS = 3 * 60 * 1000;
const SILENT_TIMEOUT_MS = 20 * 1000;

let gisPromise = null;

function loadGis() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'));
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  if (gisPromise) return gisPromise;

  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    const script = existing || document.createElement('script');
    const timer = setTimeout(() => {
      gisPromise = null;
      reject({ code: 'unavailable', message: 'Timed out loading Google Identity Services.' });
    }, 15000);

    const done = () => {
      clearTimeout(timer);
      if (window.google?.accounts?.oauth2) resolve(window.google);
      else {
        gisPromise = null;
        reject({ code: 'unavailable', message: 'Google Identity Services failed to initialise.' });
      }
    };

    script.addEventListener('load', done, { once: true });
    script.addEventListener(
      'error',
      () => {
        clearTimeout(timer);
        gisPromise = null;
        reject({
          code: 'unavailable',
          message: 'Could not load Google Identity Services (network or content blocker).'
        });
      },
      { once: true }
    );

    if (!existing) {
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return gisPromise;
}

function mapGisError(err) {
  const code = err?.type || err?.error || 'unknown';
  if (code === 'popup_closed' || code === 'access_denied' || code === 'user_cancel') {
    return { code: 'cancelled', message: 'Google sign-in was cancelled.' };
  }
  if (code === 'popup_open') {
    return { code: 'cancelled', message: 'A Google sign-in window is already open.' };
  }
  if (code === 'origin_mismatch' || code === 'idpiframe_initialization_failed') {
    return {
      code: 'unavailable',
      message:
        'This origin is not authorized for the Google OAuth client. Add it under "Authorized JavaScript origins" in Google Cloud Console.'
    };
  }
  return {
    code: 'failed',
    message: err?.message || err?.error_description || 'Google sign-in failed.'
  };
}

function requestToken({ clientId, scopes, prompt, timeoutMs }) {
  return loadGis().then(
    (google) =>
      new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn, payload) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          fn(payload);
        };
        const timer = setTimeout(
          () =>
            finish(reject, {
              code: 'cancelled',
              message: 'Google sign-in timed out. Close the Google window and retry.'
            }),
          timeoutMs
        );

        let client;
        try {
          client = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: [...new Set([...scopes, ...IDENTITY_SCOPES])].join(' '),
            callback: (response) => {
              if (response?.error) {
                finish(reject, mapGisError(response));
                return;
              }
              if (!response?.access_token) {
                finish(reject, { code: 'failed', message: 'Google did not return an access token.' });
                return;
              }
              const expiresIn = Number(response.expires_in) || 3600;
              finish(resolve, {
                accessToken: response.access_token,
                expiresAt: Date.now() + expiresIn * 1000,
                scopes: response.scope ? String(response.scope).split(' ') : scopes
              });
            },
            error_callback: (error) => finish(reject, mapGisError(error))
          });
          client.requestAccessToken({ prompt });
        } catch (err) {
          finish(reject, mapGisError(err));
        }
      })
  );
}

export const googleGisConnector = {
  id: 'google-gis',
  label: 'Google (browser OAuth)',

  isSupported({ clientId } = {}) {
    return Boolean(clientId) && typeof window !== 'undefined';
  },

  async prepare() {
    try {
      await loadGis();
      return true;
    } catch {
      return false;
    }
  },

  async signIn({ clientId, scopes = [] } = {}) {
    if (!clientId) {
      throw {
        code: 'unavailable',
        message: 'No Google OAuth client id is configured for the browser connector.'
      };
    }
    return requestToken({
      clientId,
      scopes,
      prompt: 'select_account',
      timeoutMs: INTERACTIVE_TIMEOUT_MS
    });
  },

  // Silent re-request: Google only returns a token without UI when this browser
  // session still has consent for the same client and scopes.
  async refresh({ clientId, scopes = [] } = {}) {
    if (!clientId) return null;
    try {
      return await requestToken({ clientId, scopes, prompt: '', timeoutMs: SILENT_TIMEOUT_MS });
    } catch {
      return null;
    }
  },

  // Used when Calen's API is unavailable (static build) and the server-side
  // token verification endpoint cannot be reached.
  async fetchProfile(accessToken) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data) return null;
    return {
      uid: data.sub,
      email: data.email,
      displayName: data.name,
      photoURL: data.picture,
      emailVerified: Boolean(data.email_verified)
    };
  },

  async signOut() {
    // Access tokens are memory-only; nothing is persisted to revoke locally.
  }
};
