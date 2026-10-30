import test from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, groupByDeadline } from '../src/deadlines.js';

test('deadline groups respect Manila midnight, undated tasks, and completion', () => {
  const groups = groupByDeadline([
    { id: 'overdue', dueDate: '2026-10-21T15:59:00Z' },
    { id: 'today', dueDate: '2026-10-21T16:00:00Z' },
    { id: 'upcoming', dueDate: '2026-10-22T16:00:00Z' },
    { id: 'undated', dueDate: null },
    { id: 'invalid', dueDate: 'invalid' },
    { id: 'completed', dueDate: '2026-10-20T16:00:00Z', status: 'completed' }
  ], new Date('2026-10-22T03:00:00Z'));
  assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([key, tasks]) => [key, tasks.map(task => task.id)])), {
    Overdue: ['overdue'], Today: ['today'], Upcoming: ['upcoming'],
    'No date': ['undated', 'invalid'], Completed: ['completed']
  });
});

test('missing and invalid dates never become January 1970 deadlines', () => {
  for (const value of [null, undefined, '', 'invalid']) assert.equal(dayKey(value), null);
});
