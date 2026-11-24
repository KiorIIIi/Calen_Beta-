// Pure iCalendar (RFC 5545) helpers shared by the browser app (src/app.js)
// and the Vite server middleware (vite.config.js). No DOM or Node-specific
// APIs here, so both sides import the same logic and `node --test` can
// exercise it directly. Keep this module side-effect free.

export function escapeIcsText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function formatIcsDate(isoStr) {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// RFC 5545 §3.1: content lines SHOULD NOT exceed 75 octets; longer lines are
// folded with CRLF + a single whitespace. Count UTF-8 octets (not JS string
// length) and never split a multi-byte code point.
export function foldIcsLine(line) {
  const LIMIT = 75;
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= LIMIT) return line;

  const chunks = [];
  let current = '';
  let currentBytes = 0;
  let isFirstChunk = true;
  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    // Continuation lines carry a leading space, so their payload cap is 74.
    const limit = isFirstChunk ? LIMIT : LIMIT - 1;
    if (currentBytes + chBytes > limit) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
      isFirstChunk = false;
    }
    current += ch;
    currentBytes += chBytes;
  }
  if (current) chunks.push(current);
  return chunks.join('\r\n ');
}

export function generateIcsFeed(tasks = []) {
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
  return lines.map(foldIcsLine).join('\r\n');
}

// Fallback deadline for VEVENTs without any usable date property: two days
// out at 23:59 local time (same semantics as the app's offsetDateISO(2,23,59)).
function fallbackDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}

// ============================================================================
// UNIVERSAL ICAL (.ICS) PARSER (RFC 5545 + LINE UNFOLDING + VALUE=DATE)
// Known limits (documented debt): TZID-qualified floating times are read as
// browser-local, RRULE recurrence is ignored.
// ============================================================================
export function parseIcsEvents(rawIcs, defaultSource = 'moodle', defaultCourse = 'iCal Sync') {
  if (!rawIcs || typeof rawIcs !== 'string') return [];
  // Unfold RFC 5545 folded lines
  const unfolded = rawIcs.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const events = [];

  blocks.forEach((rawBlock, i) => {
    const block = rawBlock.split('END:VEVENT')[0] || rawBlock;
    const getField = (name) => {
      const regex = new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'im');
      const m = block.match(regex);
      return m ? m[1].trim() : '';
    };

    // Cancelled events stay in Google/Moodle iCal feeds as tombstones; the
    // REST import path already skips them, so the iCal path must too.
    if (getField('STATUS').toUpperCase() === 'CANCELLED') return;

    const rawSummary = getField('SUMMARY')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\n/gi, ' ')
      .replace(/^\[Calen\]\s*/i, '');
    const rawDesc = getField('DESCRIPTION')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\n/gi, '\n');
    const rawCategories = getField('CATEGORIES').replace(/\\,/g, ',');
    const rawUid = getField('UID') || `${Date.now()}-${i}`;
    const dtStr = getField('DTEND') || getField('DTSTART') || getField('DUE');

    let dueDate = fallbackDueDate();
    if (dtStr) {
      const cleanDt = dtStr.trim();
      if (/^\d{8}T\d{6}Z?$/i.test(cleanDt)) {
        const y = cleanDt.slice(0, 4);
        const mo = cleanDt.slice(4, 6);
        const da = cleanDt.slice(6, 8);
        const hr = cleanDt.slice(9, 11);
        const mi = cleanDt.slice(11, 13);
        const sc = cleanDt.slice(13, 15);
        const suffix = cleanDt.endsWith('Z') ? 'Z' : '';
        const parsed = new Date(`${y}-${mo}-${da}T${hr}:${mi}:${sc}${suffix}`);
        if (!Number.isNaN(parsed.getTime())) dueDate = parsed.toISOString();
      } else if (/^\d{8}$/.test(cleanDt)) {
        // VALUE=DATE (all-day deadline) -> set to 23:59 on that date
        const y = cleanDt.slice(0, 4);
        const mo = cleanDt.slice(4, 6);
        const da = cleanDt.slice(6, 8);
        const parsed = new Date(`${y}-${mo}-${da}T23:59:00`);
        if (!Number.isNaN(parsed.getTime())) dueDate = parsed.toISOString();
      }
    }

    const safeUid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `${Date.now()}-${i}`;
    const prefix =
      defaultSource === 'google_calendar'
        ? 'gcal'
        : defaultSource === 'google_classroom'
        ? 'gc-ical'
        : 'mdl-ical';

    events.push({
      id: `${prefix}-${safeUid}`,
      title: rawSummary || `${defaultCourse} Event #${i + 1}`,
      priority: defaultSource === 'google_calendar' ? 'medium' : 'high',
      status: 'todo',
      source: defaultSource,
      course: rawCategories || defaultCourse,
      dueDate,
      description: rawDesc || `Imported via ${defaultCourse} (.ics) feed`,
      ...(defaultSource === 'google_calendar' ? { gcalEventId: safeUid } : {}),
      subtasks: []
    });
  });

  return events;
}
