import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeIcsText,
  foldIcsLine,
  formatIcsDate,
  generateIcsFeed,
  parseIcsEvents
} from '../src/ical-utils.js';

test('escapeIcsText escapes backslash, semicolon, comma and newlines', () => {
  assert.equal(escapeIcsText('a\\b;c,d\ne'), 'a\\\\b\\;c\\,d\\ne');
  assert.equal(escapeIcsText('a\r\nb'), 'a\\nb');
  assert.equal(escapeIcsText(null), '');
});

test('foldIcsLine keeps every physical line within 75 UTF-8 octets', () => {
  const long = 'SUMMARY:' + 'x'.repeat(300);
  const folded = foldIcsLine(long);
  for (const line of folded.split('\r\n')) {
    assert.ok(new TextEncoder().encode(line).length <= 75, `line too long: ${line.length}`);
  }
  // RFC 5545 unfolding (CRLF + single WSP removed) must restore the original.
  assert.equal(folded.replace(/\r\n[ \t]/g, ''), long);
});

test('foldIcsLine never splits a multi-byte code point', () => {
  const long = 'DESCRIPTION:' + '📚'.repeat(60) + 'ña'.repeat(40);
  const folded = foldIcsLine(long);
  for (const line of folded.split('\r\n')) {
    assert.ok(new TextEncoder().encode(line).length <= 75);
  }
  assert.equal(folded.replace(/\r\n[ \t]/g, ''), long);
  assert.ok(!folded.includes('\uFFFD'), 'no replacement chars from split surrogates');
});

test('foldIcsLine leaves short lines untouched', () => {
  assert.equal(foldIcsLine('SUMMARY:short'), 'SUMMARY:short');
});

test('generateIcsFeed folds long lines and skips undated/invalid tasks', () => {
  const ics = generateIcsFeed([
    { id: 't1', title: 'A'.repeat(200), dueDate: '2026-11-20T15:59:00Z', course: 'CS 189', description: 'd'.repeat(200) },
    { id: 't2', title: 'No deadline', dueDate: '' },
    { id: 't3', title: 'Broken', dueDate: 'not-a-date' },
    { id: 't4', title: 'Done task', dueDate: '2026-11-21T15:59:00Z', status: 'completed' }
  ]);
  for (const line of ics.split('\r\n')) {
    assert.ok(new TextEncoder().encode(line).length <= 75);
  }
  assert.ok(ics.includes('UID:t1@calen.local'));
  assert.ok(!ics.includes('No deadline'));
  assert.ok(!ics.includes('Broken'));
  assert.ok(ics.includes('SUMMARY:[Done] [CS 189]') || ics.replace(/\r\n /g, '').includes('SUMMARY:[Done]'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ics.endsWith('END:VCALENDAR'));
});

test('generateIcsFeed escapes user text instead of stripping it', () => {
  const ics = generateIcsFeed([
    { id: 't1', title: 'Essay; draft, v2', dueDate: '2026-11-20T15:59:00Z', description: 'line1\nline2' }
  ]).replace(/\r\n /g, '');
  assert.ok(ics.includes('SUMMARY:Essay\\; draft\\, v2'));
  assert.ok(ics.includes('line1\\nline2'));
});

test('formatIcsDate produces compact UTC stamps and rejects invalid input', () => {
  assert.equal(formatIcsDate('2026-11-20T15:59:00.000Z'), '20261120T155900Z');
  assert.equal(formatIcsDate('garbage'), null);
});

const SAMPLE_ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'UID:abc-123@example.com',
  'DTSTART:20261120T155900Z',
  'SUMMARY:Problem Set 4',
  'DESCRIPTION:Submit PDF',
  'CATEGORIES:CS 189',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:cancelled-1@example.com',
  'DTSTART:20261121T155900Z',
  'SUMMARY:Cancelled Quiz',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');

test('parseIcsEvents imports live events and skips STATUS:CANCELLED tombstones', () => {
  const events = parseIcsEvents(SAMPLE_ICS, 'moodle', 'Moodle iCal');
  assert.equal(events.length, 1);
  assert.equal(events[0].title, 'Problem Set 4');
  assert.equal(events[0].dueDate, '2026-11-20T15:59:00.000Z');
  assert.equal(events[0].course, 'CS 189');
  assert.equal(events[0].id, 'mdl-ical-abc-123examplecom');
});

test('parseIcsEvents unfolds folded lines and strips the [Calen] prefix', () => {
  const ics = [
    'BEGIN:VEVENT',
    'UID:fold-1',
    'DTEND:20261122T090000Z',
    'SUMMARY:[Calen] Long title that was',
    '  folded across lines',
    'END:VEVENT'
  ].join('\r\n');
  const events = parseIcsEvents(ics, 'google_calendar', 'Google Calendar');
  assert.equal(events.length, 1);
  assert.equal(events[0].title, 'Long title that was folded across lines');
  assert.equal(events[0].dueDate, '2026-11-22T09:00:00.000Z');
  assert.equal(events[0].gcalEventId, 'fold-1');
});

test('parseIcsEvents handles VALUE=DATE all-day deadlines as 23:59 local', () => {
  const ics = [
    'BEGIN:VEVENT',
    'UID:allday-1',
    'DTSTART;VALUE=DATE:20261125',
    'SUMMARY:All-day deadline',
    'END:VEVENT'
  ].join('\r\n');
  const events = parseIcsEvents(ics);
  assert.equal(events.length, 1);
  const due = new Date(events[0].dueDate);
  assert.equal(due.getHours(), 23);
  assert.equal(due.getMinutes(), 59);
});

test('parseIcsEvents round-trips through generateIcsFeed', () => {
  const tasks = [
    { id: 'task-1', title: 'Quiz; with, punctuation', dueDate: '2026-11-20T15:59:00Z', description: 'notes\nmore notes' }
  ];
  const feed = generateIcsFeed(tasks);
  const events = parseIcsEvents(feed, 'moodle', 'Moodle iCal');
  assert.equal(events.length, 1);
  assert.equal(events[0].title, 'Quiz; with, punctuation');
  assert.equal(events[0].dueDate, '2026-11-20T15:59:00.000Z');
  assert.ok(events[0].description.startsWith('notes\nmore notes'));
});

test('parseIcsEvents tolerates empty and non-string input', () => {
  assert.deepEqual(parseIcsEvents(''), []);
  assert.deepEqual(parseIcsEvents(null), []);
  assert.deepEqual(parseIcsEvents(42), []);
});
