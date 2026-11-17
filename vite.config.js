import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { DEFAULT_GOOGLE_SCOPES } from './src/auth/scopes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'workspace-db.json');

// Optional shared-workspace access token. When CALEN_WORKSPACE_TOKEN is set,
// every /api/* endpoint requires it (via ?token=... or an Authorization: Bearer
// header). Unset (default) keeps the historical open, same-machine behavior.
const WORKSPACE_TOKEN = (process.env.CALEN_WORKSPACE_TOKEN || '').trim();

// ---------------------------------------------------------------------------
// Sign-in connector configuration.
//
// The browser never hardcodes a provider: it asks /api/auth/providers which
// connectors this deployment supports. Set GOOGLE_OAUTH_CLIENT_ID (or keep the
// id in firebase-applet-config.json) and list the connector order here.
// GOOGLE_OAUTH_CLIENT_SECRET is intentionally NOT used: every connector issues
// tokens in the browser, so no secret is needed or stored server-side.
// ---------------------------------------------------------------------------
function readFirebaseAppletConfig() {
  try {
    const file = path.join(__dirname, 'firebase-applet-config.json');
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return {};
  }
}

const firebaseAppletConfig = readFirebaseAppletConfig();
const GOOGLE_CLIENT_ID =
  (process.env.GOOGLE_OAUTH_CLIENT_ID || firebaseAppletConfig.oAuthClientId || '').trim();

const AUTH_CONNECTORS = (process.env.CALEN_AUTH_CONNECTORS || 'firebase,google-gis')
  .split(',')
  .map((id) => id.trim())
  .filter((id) => {
    if (id === 'firebase') return true;
    // The browser OAuth connector needs a public client id to do anything.
    if (id === 'google-gis') return Boolean(GOOGLE_CLIENT_ID);
    return false;
  });

async function verifyGoogleAccessToken(accessToken) {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }
  );
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || data.error || !data.sub) return null;
  // Reject tokens minted for a different OAuth client when we know ours.
  if (GOOGLE_CLIENT_ID && data.aud !== GOOGLE_CLIENT_ID && data.azp !== GOOGLE_CLIENT_ID) {
    return null;
  }
  return {
    user: {
      uid: data.sub,
      email: data.email || '',
      displayName: data.name || data.email || '',
      photoURL: data.picture || '',
      emailVerified: data.email_verified === true || data.email_verified === 'true'
    },
    scopes: typeof data.scope === 'string' ? data.scope.split(' ') : [],
    expiresIn: Number(data.expires_in) || 0
  };
}

function isAuthorized(req, urlObj) {
  if (!WORKSPACE_TOKEN) return true;
  const header = req.headers.authorization || '';
  const bearer = header.replace(/^Bearer\s+/i, '');
  return (
    urlObj.searchParams.get('token') === WORKSPACE_TOKEN ||
    (bearer && bearer === WORKSPACE_TOKEN)
  );
}

// Private / loopback hostnames — blocks the tunnel/preview proxies from being
// turned into an SSRF bridge into the local network. DNS-resolvable names that
// resolve to private IPs are a known residual gap (see audit).
function isPrivateHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  if (host === '::1' || host === '::' || /^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab]/.test(host)) {
    return true; // IPv6 loopback, unspecified, ULA (fc00::/7), link-local (fe80::/10)
  }
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = v4.slice(1).map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  }
  return false;
}

function assertPublicHttpUrl(rawUrl, label) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${label} must use http:// or https://.`);
  }
  // Escape hatch for legitimately self-hosted Moodle instances on a LAN.
  if (process.env.CALEN_ALLOW_PRIVATE_UPSTREAMS === 'true') {
    return parsed;
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error(`${label} points to a private or loopback address, which is not allowed.`);
  }
  return parsed;
}

// Upstream fetches must never hang forever; a stalled Moodle/iCal host would
// otherwise pin the single-threaded dev-server event loop connection open.
const UPSTREAM_TIMEOUT_MS = 15000;

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readDb() {
  try {
    ensureDbFile();
    if (!fs.existsSync(DB_FILE)) return null;
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Calen DB] Failed to read workspace-db.json:', err);
    return null;
  }
}

function writeDb(payload) {
  ensureDbFile();
  const data = {
    ...payload,
    updatedAt: payload.updatedAt || Date.now(),
  };
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
  return data;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    req.on('data', (chunk) => {
      if (settled) return;
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        body = '';
        fail(new Error('Payload too large (limit is 5 MB).'));
      }
    });
    req.on('end', () => {
      if (settled) return;
      try {
        settled = true;
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', fail);
  });
}

function formatIcsDate(isoStr) {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcsText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function generateIcsFeed(tasks = []) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calen//Unified Academic Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Calen Deadlines',
    'X-WR-TIMEZONE:Asia/Manila',
  ];

  const stamp = formatIcsDate(new Date().toISOString());
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const endDt = new Date(task.dueDate);
    if (Number.isNaN(endDt.getTime())) continue;
    const startDt = new Date(endDt.getTime() - 60 * 60 * 1000);
    const dtStart = formatIcsDate(startDt.toISOString());
    const dtEnd = formatIcsDate(endDt.toISOString());
    if (!dtStart || !dtEnd) continue;

    const statusPrefix = task.status === 'completed' ? '[Done] ' : '';
    const coursePrefix = task.course ? `[${task.course}] ` : '';
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(task.id)}@calen.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcsText(`${statusPrefix}${coursePrefix}${task.title}`)}`,
      `DESCRIPTION:${escapeIcsText(
        `${task.description || ''}\nPriority: ${(task.priority || 'medium').toUpperCase()}\nStatus: ${task.status || 'todo'}\nSource: ${task.source || 'personal'}`
      )}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function calenServerPlugin() {
  const sseClients = new Set();

  function broadcastSse(data) {
    const msg = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of sseClients) {
      try {
        res.write(msg);
      } catch {
        sseClients.delete(res);
      }
    }
  }

  const attachMiddleware = (middlewares) => {
    middlewares.use(async (req, res, next) => {
      const urlObj = new URL(req.url || '/', 'http://localhost');
      const pathname = urlObj.pathname;

      // 0. Optional shared-workspace token gate (no effect unless
      //    CALEN_WORKSPACE_TOKEN is set in the server environment)
      if (pathname.startsWith('/api/') && !isAuthorized(req, urlObj)) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Unauthorized: missing or invalid workspace token.' }));
        return;
      }

      // 1. Server-Sent Events stream for real-time cross-origin/tunnel sync
      if (pathname === '/api/events' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });
        res.write(`data: ${JSON.stringify({ type: 'connected', ts: Date.now() })}\n\n`);
        sseClients.add(res);
        req.on('close', () => sseClients.delete(res));
        return;
      }

      // 1b. Sign-in provider discovery: the only place the browser learns which
      //     connectors exist. Keeps provider config out of the app bundle.
      if (pathname === '/api/auth/providers' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        const connectors = AUTH_CONNECTORS.filter((id) => id === 'firebase' || id === 'google-gis');
        res.end(
          JSON.stringify({
            ok: true,
            providers: [
              {
                id: 'google',
                label: 'Google',
                enabled: connectors.length > 0,
                connectors,
                clientId: GOOGLE_CLIENT_ID,
                scopes: DEFAULT_GOOGLE_SCOPES,
                verifyPath: '/api/auth/google/verify',
                signOutPath: '/api/auth/signout'
              }
            ]
          })
        );
        return;
      }

      // 1c. Verify a browser-obtained Google access token and return a
      //     normalised profile. The token is never logged or persisted.
      if (pathname === '/api/auth/google/verify' && req.method === 'POST') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        try {
          const { accessToken } = await readJsonBody(req);
          if (!accessToken || typeof accessToken !== 'string' || accessToken.length > 4096) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, code: 'invalid_request', error: 'A Google access token is required.' }));
            return;
          }
          const verified = await verifyGoogleAccessToken(accessToken.trim());
          if (!verified) {
            res.statusCode = 401;
            res.end(
              JSON.stringify({
                ok: false,
                code: 'invalid_token',
                error: 'Google rejected this access token (expired, revoked, or issued for another client).'
              })
            );
            return;
          }
          res.end(JSON.stringify({ ok: true, ...verified }));
        } catch (err) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, code: 'verify_failed', error: err.message }));
        }
        return;
      }

      // 1d. Sign-out acknowledgement. Sessions are stateless (in-memory tokens),
      //     so there is nothing server-side to revoke; the client drops them.
      if (pathname === '/api/auth/signout' && req.method === 'POST') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // 2. Get or Save Workspace Database (shared between localhost and https tunnel)
      if (pathname === '/api/workspace') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        if (req.method === 'GET') {
          const data = readDb();
          res.end(JSON.stringify({ ok: true, workspace: data }));
          return;
        }
        if (req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
            const settings =
              body.settings && typeof body.settings === 'object' && !Array.isArray(body.settings)
                ? body.settings
                : {};
            const saved = writeDb({
              tasks: Array.isArray(body.tasks) ? body.tasks : [],
              moodleCourses: Array.isArray(body.moodleCourses) ? body.moodleCourses : [],
              classroomCourses: Array.isArray(body.classroomCourses) ? body.classroomCourses : [],
              settings,
              updatedAt: body.updatedAt || Date.now(),
            });
            broadcastSse({
              type: 'workspace_updated',
              updatedAt: saved.updatedAt,
              clientId: body.clientId || null,
            });
            res.end(JSON.stringify({ ok: true, updatedAt: saved.updatedAt }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
          return;
        }
      }

      // 3. Live iCal (.ics) Feed for Phone / Google Calendar / Apple Calendar subscription
      if (pathname === '/api/calendar.ics' && req.method === 'GET') {
        const db = readDb();
        const ics = generateIcsFeed(db?.tasks || []);
        res.writeHead(200, {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'attachment; filename="calen-deadlines.ics"',
          'Cache-Control': 'no-cache',
        });
        res.end(ics);
        return;
      }

      // 4. Server-side iCal (.ics) URL Proxy (bypasses CORS for Moodle, Google Calendar & Classroom iCal feeds)
      if (pathname === '/api/proxy/ical' && req.method === 'POST') {
        res.setHeader('Content-Type', 'application/json');
        try {
          const { url } = await readJsonBody(req);
          if (!url || typeof url !== 'string') {
            throw new Error('Please provide a valid iCal (.ics) URL.');
          }
          const normalizedUrl = url.trim().replace(/^webcal:\/\//i, 'https://');
          assertPublicHttpUrl(normalizedUrl, 'The iCal URL');
          const upstream = await fetch(normalizedUrl, {
            headers: { 'User-Agent': 'Calen-Academic-Planner/1.0' },
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
          });
          if (!upstream.ok) {
            throw new Error(`Upstream calendar returned HTTP ${upstream.status}`);
          }
          const icsText = await upstream.text();
          if (!icsText.includes('BEGIN:VCALENDAR')) {
            throw new Error('The URL did not return a valid iCalendar (.ics) file.');
          }
          res.end(JSON.stringify({ ok: true, ics: icsText }));
        } catch (err) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
        return;
      }

      // 5. Server-side Moodle LMS REST API Proxy
      if (pathname === '/api/proxy/moodle' && req.method === 'POST') {
        res.setHeader('Content-Type', 'application/json');
        try {
          const { moodleUrl, token } = await readJsonBody(req);
          if (!moodleUrl || !token) {
            throw new Error('Both Moodle URL and WebService Token are required.');
          }
          const baseUrl = moodleUrl.trim().replace(/\/+$/, '');
          assertPublicHttpUrl(baseUrl, 'The Moodle URL');
          const restEndpoint = `${baseUrl}/webservice/rest/server.php`;

          const callMoodle = async (wsfunction, extraParams = {}) => {
            const params = new URLSearchParams({
              wstoken: token.trim(),
              moodlewsrestformat: 'json',
              wsfunction,
              ...extraParams,
            });
            const r = await fetch(`${restEndpoint}?${params.toString()}`, {
              signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
            });
            if (!r.ok) throw new Error(`Moodle HTTP ${r.status}`);
            const data = await r.json();
            if (data && data.exception) {
              throw new Error(data.message || data.exception);
            }
            return data;
          };

          const siteInfo = await callMoodle('core_webservice_get_site_info');
          const userId = siteInfo.userid;
          const rawCourses = await callMoodle('core_enrol_get_users_courses', { userid: String(userId) });

          let assignCourses = [];
          try {
            const assignData = await callMoodle('mod_assign_get_assignments');
            assignCourses = Array.isArray(assignData?.courses) ? assignData.courses : [];
          } catch {
            assignCourses = [];
          }

          let actionEvents = [];
          try {
            const calData = await callMoodle('core_calendar_get_action_events_by_timesort', {
              limitnum: '50',
            });
            actionEvents = Array.isArray(calData?.events) ? calData.events : [];
          } catch {
            actionEvents = [];
          }

          const courses = (Array.isArray(rawCourses) ? rawCourses : []).map((c) => {
            const code = c.shortname || `COURSE-${c.id}`;
            const assignCourse = assignCourses.find((ac) => ac.id === c.id);
            const rawAssignments = Array.isArray(assignCourse?.assignments)
              ? assignCourse.assignments
              : [];

            const assignments = rawAssignments
              .filter((a) => a.duedate && a.duedate > 0)
              .map((a) => ({
                id: `mdl-task-${c.id}-${a.id}`,
                title: a.name || 'Moodle Assignment',
                priority: 'high',
                status: 'todo',
                source: 'moodle',
                course: code,
                dueDate: new Date(a.duedate * 1000).toISOString(),
                description: (a.intro || 'Synced via Moodle REST API').replace(/<[^>]*>/g, '').trim(),
                subtasks: [],
              }));

            // Also include calendar action events for this course not already in assignments
            const courseEvents = actionEvents.filter((ev) => ev.course?.id === c.id && ev.timestart);
            for (const ev of courseEvents) {
              const evId = `mdl-task-ev-${ev.id}`;
              if (!assignments.some((a) => a.title === ev.name)) {
                assignments.push({
                  id: evId,
                  title: ev.name || 'Moodle Activity',
                  priority: 'medium',
                  status: 'todo',
                  source: 'moodle',
                  course: code,
                  dueDate: new Date(ev.timestart * 1000).toISOString(),
                  description: (ev.description || 'Moodle Calendar Event').replace(/<[^>]*>/g, '').trim(),
                  subtasks: [],
                });
              }
            }

            return {
              id: `moodle-live-${c.id}`,
              code,
              name: c.fullname || code,
              instructor: siteInfo.sitename || 'Moodle LMS',
              term: 'Current Term',
              synced: true,
              assignments,
            };
          });

          res.end(
            JSON.stringify({
              ok: true,
              siteName: siteInfo.sitename,
              userFullName: siteInfo.fullname,
              courses,
            })
          );
        } catch (err) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
        return;
      }

      // 6. Server-side Google Classroom REST API Proxy
      if (pathname === '/api/proxy/classroom' && req.method === 'POST') {
        res.setHeader('Content-Type', 'application/json');
        try {
          const { accessToken } = await readJsonBody(req);
          if (!accessToken) {
            throw new Error('Google Classroom OAuth Access Token is required.');
          }
          const coursesRes = await fetch(
            'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=30',
            {
              headers: { Authorization: `Bearer ${accessToken.trim()}` },
              signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
            }
          );
          if (!coursesRes.ok) {
            const errJson = await coursesRes.json().catch(() => ({}));
            throw new Error(errJson.error?.message || `Classroom API HTTP ${coursesRes.status}`);
          }
          const coursesData = await coursesRes.json();
          const rawCourses = Array.isArray(coursesData.courses) ? coursesData.courses : [];

          const courses = [];
          for (const c of rawCourses) {
            const cwRes = await fetch(
              `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(c.id)}/courseWork?pageSize=30`,
              {
                headers: { Authorization: `Bearer ${accessToken.trim()}` },
                signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
              }
            );
            const cwData = cwRes.ok ? await cwRes.json() : {};
            const workItems = Array.isArray(cwData.courseWork) ? cwData.courseWork : [];
            const code = c.section ? `${c.name} (${c.section})` : c.name || `CLASS-${c.id}`;

            const assignments = workItems.map((w) => {
              let dueIso = new Date(Date.now() + 3 * 86400000).toISOString();
              if (w.dueDate?.year && w.dueDate?.month && w.dueDate?.day) {
                const yr = w.dueDate.year;
                const mo = String(w.dueDate.month).padStart(2, '0');
                const da = String(w.dueDate.day).padStart(2, '0');
                const hr = String(w.dueTime?.hours ?? 23).padStart(2, '0');
                const mi = String(w.dueTime?.minutes ?? 59).padStart(2, '0');
                const parsed = new Date(`${yr}-${mo}-${da}T${hr}:${mi}:00Z`);
                if (!Number.isNaN(parsed.getTime())) dueIso = parsed.toISOString();
              }
              return {
                id: `gc-work-${w.id}`,
                title: w.title || 'Classroom Assignment',
                priority: 'high',
                status: 'todo',
                source: 'google_classroom',
                course: c.name || code,
                dueDate: dueIso,
                description: w.description || w.alternateLink || 'Synced from Google Classroom',
                subtasks: [],
              };
            });

            courses.push({
              id: `classroom-${c.id}`,
              code: c.name || code,
              name: c.descriptionHeading || c.section || 'Google Classroom Course',
              instructor: c.ownerId || 'Google Classroom',
              synced: true,
              assignments,
            });
          }

          res.end(JSON.stringify({ ok: true, courses }));
        } catch (err) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
        return;
      }

      next();
    });
  };

  return {
    name: 'calen-local-db-and-sync-api',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [calenServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      allowedHosts: true,
    },
  };
});
