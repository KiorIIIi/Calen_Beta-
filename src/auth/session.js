// Pure, framework-free sign-in session state.
//
// Nothing here touches the DOM, storage, or the network, which keeps the
// session rules unit-testable with `node --test` while the connectors decide
// how a token is actually obtained.
//
// Status values:
//   'signed-out'    no identity and no token
//   'authenticating' a connector prompt is open
//   'signed-in'     access token present and not expired
//   'needs-reauth'  identity known (or a token expired) but no usable token
//   'error'         the last sign-in attempt failed

export const DEFAULT_TOKEN_LIFETIME_MS = 55 * 60 * 1000;
export const EXPIRY_SKEW_MS = 60 * 1000;

export function createSession() {
  return {
    status: 'signed-out',
    provider: null,
    token: null,
    expiresAt: 0,
    user: null, // app profile: { uid, email, displayName, photoURL }
    cloudUser: null, // Firebase Auth user, when the firebase connector is used
    error: null,
    updatedAt: 0
  };
}

function normalizeProfile(user, fallback = {}) {
  if (!user) return null;
  const email = user.email || fallback.email || '';
  return {
    uid: user.uid || user.sub || fallback.uid || (email ? `email:${email}` : ''),
    email,
    displayName: user.displayName || user.name || user.display_name || email || '',
    photoURL: user.photoURL || user.picture || '',
    emailVerified: Boolean(user.emailVerified ?? user.verified_email ?? false)
  };
}

function clampExpiry(expiresAt, now) {
  const value = Number(expiresAt);
  if (!Number.isFinite(value) || value <= 0) return now + DEFAULT_TOKEN_LIFETIME_MS;
  return value;
}

export function reduceSession(session, action) {
  const now = action.now ?? Date.now();
  switch (action.type) {
    case 'start':
      return {
        ...session,
        status: 'authenticating',
        provider: action.provider ?? session.provider,
        error: null,
        updatedAt: now
      };

    case 'success':
      return {
        ...session,
        status: 'signed-in',
        provider: action.provider ?? session.provider,
        token: action.token || null,
        expiresAt: action.token ? clampExpiry(action.expiresAt, now) : 0,
        user: normalizeProfile(action.user) || session.user,
        cloudUser: action.cloudUser ?? session.cloudUser ?? null,
        error: null,
        updatedAt: now
      };

    case 'token':
      return {
        ...session,
        status: 'signed-in',
        token: action.token || null,
        expiresAt: action.token ? clampExpiry(action.expiresAt, now) : 0,
        updatedAt: now
      };

    case 'identity':
      return {
        ...session,
        user: normalizeProfile(action.user) || session.user,
        cloudUser: action.cloudUser ?? session.cloudUser ?? null,
        status: session.token ? 'signed-in' : 'needs-reauth',
        updatedAt: now
      };

    case 'expire':
      return {
        ...session,
        status: session.cloudUser || session.user ? 'needs-reauth' : 'signed-out',
        token: null,
        expiresAt: 0,
        updatedAt: now
      };

    case 'failure':
      return {
        ...session,
        status: 'error',
        token: null,
        expiresAt: 0,
        error: action.error || { code: 'signin_failed', message: 'Sign-in failed.' },
        updatedAt: now
      };

    case 'dismiss-error':
      return {
        ...session,
        status: session.token ? 'signed-in' : session.cloudUser || session.user ? 'needs-reauth' : 'signed-out',
        error: null,
        updatedAt: now
      };

    case 'signout':
      return { ...createSession(), status: 'signed-out', updatedAt: now };

    default:
      return session;
  }
}

export function isTokenFresh(session, now = Date.now(), skewMs = EXPIRY_SKEW_MS) {
  if (!session?.token) return false;
  if (!session.expiresAt) return true;
  return session.expiresAt - skewMs > now;
}

export function sessionNeedsToken(session, now = Date.now()) {
  return !isTokenFresh(session, now);
}

export function describeSession(session) {
  if (!session) return 'Signed out';
  switch (session.status) {
    case 'authenticating':
      return 'Waiting for Google…';
    case 'signed-in':
      return session.user?.email ? `Signed in as ${session.user.email}` : 'Signed in';
    case 'needs-reauth':
      return session.user?.email
        ? `Reconnect Google for ${session.user.email}`
        : 'Reconnect Google Calendar';
    case 'error':
      return session.error?.message || 'Sign-in failed';
    default:
      return 'Signed out';
  }
}

export function authError(code, message, extra = {}) {
  return { code, message, ...extra };
}
