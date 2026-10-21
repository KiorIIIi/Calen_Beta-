import { Task } from '../types';
import { playReminderChime } from './audioChime';

export interface UpcomingAlert {
  task: Task;
  type: 'overdue' | 'due_soon' | 'due_today';
  minutesRemaining: number;
  message: string;
}

export function getUpcomingAlerts(tasks: Task[]): UpcomingAlert[] {
  const now = new Date().getTime();
  const alerts: UpcomingAlert[] = [];

  tasks.forEach((task) => {
    if (task.status === 'completed') return;
    const dueTime = new Date(task.dueDate).getTime();
    if (isNaN(dueTime)) return;

    const diffMinutes = Math.round((dueTime - now) / (1000 * 60));

    if (diffMinutes < 0) {
      // Overdue
      const hoursAgo = Math.abs(Math.round(diffMinutes / 60));
      alerts.push({
        task,
        type: 'overdue',
        minutesRemaining: diffMinutes,
        message: hoursAgo > 24 
          ? `Overdue by ${Math.round(hoursAgo / 24)} days: "${task.title}"`
          : `Overdue by ${hoursAgo} hr(s): "${task.title}"`,
      });
    } else if (diffMinutes <= 180) {
      // Due within 3 hours
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;
      alerts.push({
        task,
        type: 'due_soon',
        minutesRemaining: diffMinutes,
        message: `Due in ${timeStr}: "${task.title}" (${task.courseCode || task.courseName || task.source})`,
      });
    } else if (diffMinutes <= 1440) {
      // Due within 24 hours (today)
      const hours = Math.round(diffMinutes / 60);
      alerts.push({
        task,
        type: 'due_today',
        minutesRemaining: diffMinutes,
        message: `Due today in ~${hours} hrs: "${task.title}"`,
      });
    }
  });

  // Sort by urgency: overdue first, then lowest minutes remaining
  return alerts.sort((a, b) => a.minutesRemaining - b.minutesRemaining);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

export function sendDesktopNotification(title: string, body: string): void {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
      playReminderChime();
    }
  } catch (err) {
    console.debug('Notification trigger error:', err);
  }
}
