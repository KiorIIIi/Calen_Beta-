import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSession,
  reduceSession,
  isTokenFresh,
  sessionNeedsToken,
  describeSession,
  DEFAULT_TOKEN_LIFETIME_MS
} from '../src/auth/session.js';

const NOW = 1_700_000_000_000;

function fresh() {
  return createSession();
}

test('new sessions start signed out with no token', () => {
  const session = fresh();
  assert.equal(session.status, 'signed-out');
  assert.equal(session.token, null);
  assert.equal(session.user, null);
  assert.equal(session.cloudUser, null);
  assert.equal(isTokenFresh(session, NOW), false);
  assert.equal(sessionNeedsToken(session, NOW), true);
});

test('start moves to authenticating and clears previous errors', () => {
  const errored = reduceSession(fresh(), {
    type: 'failure',
    error: { code: 'failed', message: 'nope' },
    now: NOW
  });
  const session = reduceSession(errored, { type: 'start', provider: 'google-gis', now: NOW });
  assert.equal(session.status, 'authenticating');
  assert.equal(session.provider, 'google-gis');
  assert.equal(session.error, null);
});

test('success stores the token, expiry and normalised profile', () => {
  const session = reduceSession(fresh(), {
    type: 'success',
    provider: 'google-gis',
    token: 'ya29.token',
    expiresAt: NOW + 3600_000,
    user: {
      sub: 'google-sub-1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      picture: 'https://example.com/a.png'
    },
    now: NOW
  });

  assert.equal(session.status, 'signed-in');
  assert.equal(session.token, 'ya29.token');
  assert.equal(session.user.uid, 'google-sub-1');
  assert.equal(session.user.email, 'ada@example.com');
  assert.equal(session.user.displayName, 'Ada Lovelace');
  assert.equal(session.user.photoURL, 'https://example.com/a.png');
  assert.equal(isTokenFresh(session, NOW), true);
  assert.match(describeSession(session), /ada@example\.com/);
});

test('success without an expiry falls back to a conservative lifetime', () => {
  const session = reduceSession(fresh(), {
    type: 'success',
    provider: 'manual',
    token: 'token',
    expiresAt: 0,
    now: NOW
  });
  assert.equal(session.expiresAt, NOW + DEFAULT_TOKEN_LIFETIME_MS);
});

test('tokens are treated as stale inside the expiry skew window', () => {
  const session = reduceSession(fresh(), {
    type: 'success',
    provider: 'firebase',
    token: 'token',
    expiresAt: NOW + 30_000,
    now: NOW
  });
  assert.equal(isTokenFresh(session, NOW), false);
  assert.equal(isTokenFresh(session, NOW, 0), true);
});

test('expiring a token keeps the identity but demands a reconnect', () => {
  const signedIn = reduceSession(fresh(), {
    type: 'success',
    provider: 'firebase',
    token: 'token',
    expiresAt: NOW + 3600_000,
    user: { email: 'grace@example.com' },
    cloudUser: { uid: 'fb-uid-1' },
    now: NOW
  });
  const expired = reduceSession(signedIn, { type: 'expire', now: NOW + 7200_000 });

  assert.equal(expired.status, 'needs-reauth');
  assert.equal(expired.token, null);
  assert.equal(expired.expiresAt, 0);
  assert.equal(expired.cloudUser.uid, 'fb-uid-1');
  assert.match(describeSession(expired), /Reconnect/);
});

test('losing a token with no identity returns to signed out', () => {
  const expired = reduceSession(fresh(), { type: 'expire', now: NOW });
  assert.equal(expired.status, 'signed-out');
});

test('a cancelled retry keeps a token that is still valid', () => {
  const signedIn = reduceSession(fresh(), {
    type: 'success',
    provider: 'google-gis',
    token: 'token',
    expiresAt: NOW + 3600_000,
    now: NOW
  });
  const failed = reduceSession(signedIn, {
    type: 'failure',
    error: { code: 'cancelled', message: 'Google sign-in was cancelled.' },
    now: NOW + 1000
  });

  assert.equal(failed.status, 'error');
  assert.equal(failed.token, 'token');
  assert.equal(failed.expiresAt, NOW + 3600_000);
  assert.equal(failed.error.code, 'cancelled');
  assert.equal(describeSession(failed), 'Google sign-in was cancelled.');
  assert.equal(isTokenFresh(failed, NOW + 1000), true);
});

test('a failed sign-in from signed out leaves no token', () => {
  const failed = reduceSession(fresh(), {
    type: 'failure',
    error: { code: 'cancelled', message: 'Google sign-in was cancelled.' },
    now: NOW
  });
  assert.equal(failed.status, 'error');
  assert.equal(failed.token, null);
  assert.equal(failed.expiresAt, 0);
});

test('dismissing an error restores the previous sign-in posture', () => {
  const base = reduceSession(fresh(), {
    type: 'success',
    provider: 'firebase',
    token: 'token',
    expiresAt: NOW + 3600_000,
    user: { email: 'linus@example.com' },
    cloudUser: { uid: 'fb-uid-2' },
    now: NOW
  });
  const failed = reduceSession(base, {
    type: 'failure',
    error: { code: 'failed', message: 'boom' },
    now: NOW
  });
  const dismissed = reduceSession(failed, { type: 'dismiss-error', now: NOW });

  // The failure kept the still-valid token, so dismissing the message returns
  // the user to a working session instead of forcing a reconnect.
  assert.equal(dismissed.status, 'signed-in');
  assert.equal(dismissed.error, null);
  assert.equal(dismissed.token, 'token');
});

test('identity restore keeps a valid token signed in', () => {
  const signedIn = reduceSession(fresh(), {
    type: 'success',
    provider: 'firebase',
    token: 'token',
    expiresAt: NOW + 3600_000,
    now: NOW
  });
  const restored = reduceSession(signedIn, {
    type: 'identity',
    user: { uid: 'fb-uid-3', email: 'restored@example.com' },
    cloudUser: { uid: 'fb-uid-3' },
    now: NOW
  });

  assert.equal(restored.status, 'signed-in');
  assert.equal(restored.user.email, 'restored@example.com');
  assert.equal(restored.cloudUser.uid, 'fb-uid-3');
});

test('sign out wipes token, profile and cloud identity', () => {
  const signedIn = reduceSession(fresh(), {
    type: 'success',
    provider: 'firebase',
    token: 'token',
    expiresAt: NOW + 3600_000,
    user: { email: 'ada@example.com' },
    cloudUser: { uid: 'fb-uid-4' },
    now: NOW
  });
  const out = reduceSession(signedIn, { type: 'signout', now: NOW });

  assert.equal(out.status, 'signed-out');
  assert.equal(out.token, null);
  assert.equal(out.user, null);
  assert.equal(out.cloudUser, null);
  assert.equal(out.provider, null);
});
