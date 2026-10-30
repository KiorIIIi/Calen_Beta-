export function dayKey(value, timeZone = 'Asia/Manila') {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

export function groupByDeadline(tasks, now = new Date()) {
  const today = dayKey(now);
  const groups = { Overdue: [], Today: [], Upcoming: [], 'No date': [], Completed: [] };
  for (const task of tasks) {
    const due = dayKey(task.dueDate);
    const group = task.status === 'completed' ? 'Completed'
      : !due ? 'No date' : due < today ? 'Overdue' : due === today ? 'Today' : 'Upcoming';
    groups[group].push(task);
  }
  return groups;
}
