// Sign-in configuration discovery.
//
// Calen's API is the source of truth for how a deployment signs users in
// (client id, scopes, connector order). The Vite env vars are only a fallback
// for static builds where the middleware does not exist.
import { apiFetch } from '../api.js';
import { DEFAULT_GOOGLE_SCOPES, parseScopes } from './scopes.js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const DEFAULT_CONNECTOR_ORDER = ['firebase', 'google-gis'];

function envFlag(name, fallback = false) {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  return String(raw).toLowerCase() === 'true' || String(raw) === '1';
}

function fallbackConfig() {
  return {
    discovered: false,
    clientId: String(env.VITE_GOOGLE_CLIENT_ID || ''),
    scopes: parseScopes(env.VITE_GOOGLE_OAUTH_SCOPES).length
      ? parseScopes(env.VITE_GOOGLE_OAUTH_SCOPES)
      : [...DEFAULT_GOOGLE_SCOPES],
    connectors: envFlag('VITE_DISABLE_FIREBASE_AUTH')
      ? ['google-gis']
      : [...DEFAULT_CONNECTOR_ORDER],
    verifyPath: '/api/auth/google/verify',
    signOutPath: '/api/auth/signout',
    connectorsAvailable: true
  };
}

function normalizeProviders(payload) {
  const google = (Array.isArray(payload?.providers) ? payload.providers : []).find(
    (p) => p && p.id === 'google'
  );
  if (!google) return null;

  const connectors = Array.isArray(google.connectors)
    ? google.connectors.map(String).filter(Boolean)
    : [...DEFAULT_CONNECTOR_ORDER];

  return {
    discovered: true,
    clientId: String(google.clientId || env.VITE_GOOGLE_CLIENT_ID || ''),
    scopes:
      Array.isArray(google.scopes) && google.scopes.length
        ? google.scopes.map(String)
        : [...DEFAULT_GOOGLE_SCOPES],
    connectors: connectors.length ? connectors : [...DEFAULT_CONNECTOR_ORDER],
    verifyPath: google.verifyPath || '/api/auth/google/verify',
    signOutPath: google.signOutPath || '/api/auth/signout',
    connectorsAvailable: google.enabled !== false
  };
}

let cached = null;
let pending = null;

export function getAuthConfig() {
  return cached || fallbackConfig();
}

export async function loadAuthConfig({ force = false } = {}) {
  if (cached && !force) return cached;
  if (pending) return pending;

  pending = apiFetch('/api/auth/providers', { timeoutMs: 8000 })
    .then((payload) => {
      const normalized = normalizeProviders(payload);
      cached = normalized || { ...fallbackConfig(), discovered: true, connectors: [] };
      return cached;
    })
    .catch(() => {
      // Static build / offline: keep working with the build-time defaults.
      cached = { ...fallbackConfig(), connectorsAvailable: false };
      return cached;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}
