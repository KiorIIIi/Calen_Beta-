// Calen sign-in facade.
//
// Everything the app needs from authentication goes through this module:
//
//   initAuth()                 discover configuration and restore identity
//   signIn([connectorId])      run a connector's OAuth flow
//   signOut()                  drop the session and the in-memory token
//   getSession()               current session snapshot
//   subscribeAuth(fn)          session changes (fires immediately)
//   getAccessToken()           sync read, null when expired/missing
//   ensureAccessToken()        sync/refresh/prompt as needed (API callers)
//   setManualAccessToken(t)    user-supplied token (Settings → Calendar)
//
// Connectors are the only place that knows how a provider behaves. Adding
// Microsoft/Apple later means adding one connector and listing it in Calen's
// /api/auth/providers response — no changes in app.js.
import { apiFetch } from '../api.js';
import { loadAuthConfig, getAuthConfig } from './config.js';
import { createSession, reduceSession, isTokenFresh, describeSession } from './session.js';
import { firebaseConnector } from './connectors/firebase.js';
import { googleGisConnector } from './connectors/google-gis.js';

const CONNECTORS = {
  firebase: firebaseConnector,
  'google-gis': googleGisConnector
};

let session = createSession();
let activeConnectorId = null;
let readyPromise = null;
let signInPromise = null;
let identityBound = false;
const listeners = new Set();

function emit() {
  const snapshot = session;
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error('[auth] listener failed:', err);
    }
  });
  return snapshot;
}

function dispatch(action) {
  session = reduceSession(session, { ...action, now: action.now ?? Date.now() });
  return emit();
}

function profileFromCloudUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email || '',
    photoURL: user.photoURL || '',
    emailVerified: Boolean(user.emailVerified)
  };
}

function connectorOrder(config) {
  return Array.isArray(config?.connectors) && config.connectors.length
    ? config.connectors
    : ['firebase', 'google-gis'];
}

function isSupported(id, config) {
  const connector = CONNECTORS[id];
  if (!connector) return false;
  if (typeof connector.isSupported !== 'function') return true;
  try {
    return connector.isSupported({ clientId: config.clientId });
  } catch {
    return false;
  }
}

function bindIdentity() {
  if (identityBound) return;
  identityBound = true;
  const connector = CONNECTORS.firebase;
  if (!connector?.onAuthStateChanged) return;
  connector.onAuthStateChanged((cloudUser) => {
    activeConnectorId = activeConnectorId || 'firebase';
    if (cloudUser) {
      dispatch({
        type: 'identity',
        user: profileFromCloudUser(cloudUser),
        cloudUser
      });
    } else if (session.cloudUser) {
      // Signed out in another tab / token revoked.
      dispatch({ type: 'signout' });
    }
  });
}

export async function initAuth({ force = false } = {}) {
  if (readyPromise && !force) return readyPromise;
  readyPromise = loadAuthConfig({ force })
    .then((config) => {
      bindIdentity();
      return config;
    })
    .catch(() => getAuthConfig());
  return readyPromise;
}

export function getSession() {
  return session;
}

export function subscribeAuth(listener) {
  listeners.add(listener);
  initAuth()
    .then(() => listener(session))
    .catch(() => listener(session));
  return () => listeners.delete(listener);
}

export function getAuthProviders() {
  const config = getAuthConfig();
  return connectorOrder(config).map((id) => ({
    id,
    label: CONNECTORS[id]?.label || id,
    available: isSupported(id, config)
  }));
}

export function getAuthSummary() {
  const config = getAuthConfig();
  return {
    status: session.status,
    description: describeSession(session),
    error: session.error,
    provider: session.provider,
    user: session.user,
    hasToken: isTokenFresh(session),
    connectors: getAuthProviders(),
    apiDiscovered: Boolean(config.discovered),
    clientConfigured: Boolean(config.clientId)
  };
}

async function verifyTokenViaApi(accessToken) {
  const config = getAuthConfig();
  try {
    const data = await apiFetch(config.verifyPath, {
      method: 'POST',
      body: { accessToken },
      timeoutMs: 10000
    });
    return data?.user || null;
  } catch {
    return null;
  }
}

export async function signIn(preferredId) {
  if (signInPromise) return signInPromise;
  const config = await initAuth();

  signInPromise = (async () => {
    const order = preferredId ? [preferredId] : connectorOrder(config);
    dispatch({ type: 'start' });
    const failures = [];

    for (const id of order) {
      const connector = CONNECTORS[id];
      if (!connector) continue;
      if (!isSupported(id, config)) {
        failures.push({
          code: 'unavailable',
          message: `${connector.label || id} is not configured for this deployment.`
        });
        continue;
      }

      try {
        const result = await connector.signIn({ clientId: config.clientId, scopes: config.scopes });
        if (!result?.accessToken) {
          failures.push({ code: 'failed', message: 'The provider did not return an access token.' });
          continue;
        }

        let user = result.user || null;
        if (!user) {
          user =
            (await verifyTokenViaApi(result.accessToken)) ||
            (connector.fetchProfile ? await connector.fetchProfile(result.accessToken) : null);
        }

        activeConnectorId = id;
        return dispatch({
          type: 'success',
          provider: id,
          token: result.accessToken,
          expiresAt: result.expiresAt,
          user,
          cloudUser: result.cloudUser || null
        });
      } catch (err) {
        const mapped = {
          code: err?.code || 'failed',
          message: err?.message || 'Sign-in failed.'
        };
        failures.push(mapped);
        if (mapped.code === 'cancelled') {
          return dispatch({ type: 'failure', error: mapped });
        }
        // Config/popup failures fall through to the next connector.
      }
    }

    const last = failures[failures.length - 1] || {
      code: 'failed',
      message: 'No sign-in method is available in this build.'
    };
    return dispatch({ type: 'failure', error: last });
  })()
    .catch((err) => dispatch({ type: 'failure', error: { code: 'failed', message: err?.message } }))
    .finally(() => {
      signInPromise = null;
    });

  return signInPromise;
}

export async function signOut() {
  const config = await initAuth();
  const connector = CONNECTORS[activeConnectorId] || (isSupported('firebase', config) ? CONNECTORS.firebase : null);
  // Always clear Firebase identity so Firestore listeners detach.
  if (CONNECTORS.firebase?.signOut) await CONNECTORS.firebase.signOut();
  if (connector && connector !== CONNECTORS.firebase && connector.signOut) {
    await connector.signOut().catch(() => {});
  }
  activeConnectorId = null;
  return dispatch({ type: 'signout' });
}

export function clearAuthError() {
  if (session.error) dispatch({ type: 'dismiss-error' });
}

export function getAccessToken() {
  return isTokenFresh(session) ? session.token : null;
}

export function hasAccessToken() {
  return isTokenFresh(session);
}

// Called by API helpers when Google rejects the token (401/403).
export function invalidateAccessToken() {
  if (!session.token) return session;
  return dispatch({ type: 'expire' });
}

export function setManualAccessToken(token) {
  const value = token ? String(token).trim() : '';
  if (!value) {
    activeConnectorId = null;
    return dispatch({ type: 'expire' });
  }
  activeConnectorId = 'manual';
  const snapshot = dispatch({
    type: 'success',
    provider: 'manual',
    token: value,
    expiresAt: 0
  });
  // Best effort profile lookup; the token is still usable without it.
  verifyTokenViaApi(value)
    .then((user) => {
      if (user && session.token === value) dispatch({ type: 'success', provider: 'manual', token: value, user });
    })
    .catch(() => {});
  return snapshot;
}

export async function ensureAccessToken({ interactive = true } = {}) {
  if (isTokenFresh(session)) return session.token;
  const config = await initAuth();

  const connector = CONNECTORS[activeConnectorId];
  if (connector?.refresh) {
    const refreshed = await connector
      .refresh({ clientId: config.clientId, scopes: config.scopes })
      .catch(() => null);
    if (refreshed?.accessToken) {
      dispatch({
        type: 'token',
        token: refreshed.accessToken,
        expiresAt: refreshed.expiresAt
      });
      return refreshed.accessToken;
    }
  }

  if (session.token) dispatch({ type: 'expire' });

  if (!interactive) {
    const err = new Error('Google authorization required.');
    err.code = 'NEEDS_AUTH';
    throw err;
  }

  const result = await signIn(activeConnectorId && CONNECTORS[activeConnectorId] ? activeConnectorId : undefined);
  if (isTokenFresh(result)) return result.token;

  const err = new Error(result.error?.message || 'Google authorization required.');
  err.code = 'NEEDS_AUTH';
  throw err;
}
