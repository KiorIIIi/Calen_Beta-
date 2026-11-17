// OAuth scopes Calen asks Google for. Kept in one place so the browser
// connectors and the server-side auth API agree on what a session can do.
export const DEFAULT_GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly'
];

// Identity scopes are connector-specific: Firebase Auth already returns the
// profile, while a raw OAuth token flow needs them to read /userinfo.
export const IDENTITY_SCOPES = ['openid', 'email', 'profile'];

export function parseScopes(value) {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
