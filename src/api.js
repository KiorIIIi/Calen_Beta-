// Shared HTTP plumbing for Calen's same-origin API (/api/*).
//
// The Vite middleware that serves these routes is optional: a static `dist/`
// deployment has no backend. Callers must therefore treat network failures as
// "feature unavailable" instead of crashing.

const TOKEN_STORAGE_KEY = 'calen_workspace_token';

export function getWorkspaceToken() {
  try {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) sessionStorage.setItem(TOKEN_STORAGE_KEY, urlToken);
    return urlToken || sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function apiUrl(path) {
  const token = getWorkspaceToken();
  if (!token) return path;
  return `${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'api_error', body = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export async function apiFetch(path, { method = 'GET', body, headers = {}, timeoutMs = 20000 } = {}) {
  const init = { method, headers: { ...headers }, signal: AbortSignal.timeout(timeoutMs) };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(apiUrl(path), init);
  } catch (err) {
    throw new ApiError('Calen API is unreachable (offline or static build).', {
      code: 'api_unreachable',
      body: err
    });
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok || (data && data.ok === false)) {
    throw new ApiError(data?.error || `Request failed (HTTP ${res.status}).`, {
      status: res.status,
      code: data?.code || 'api_error',
      body: data
    });
  }
  return data ?? {};
}
