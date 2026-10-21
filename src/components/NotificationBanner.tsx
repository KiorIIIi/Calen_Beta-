import React, { useState } from 'react';
import { UpcomingAlert } from '../services/notificationService';
import { AlertTriangle, Clock, X, ChevronRight, Bell } from 'lucide-react';
import { Task } from '../types';

interface Props {
  alerts: UpcomingAlert[];
  onSelectTask: (task: Task) => void;
}

export const NotificationBanner: React.FC<Props> = ({ alerts, onSelectTask }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || alerts.length === 0) return null;

  // Show the most urgent alert
  const urgent = alerts[0];

  return (
    <div className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div 
          onClick={() => onSelectTask(urgent.task)}
          className="flex items-center gap-2.5 cursor-pointer hover:underline text-amber-950 dark:text-amber-200 truncate flex-1"
        >
          {urgent.type === 'overdue' ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span className="font-semibold shrink-0">
            {urgent.type === 'overdue' ? 'Overdue Deadline:' : 'Upcoming Cutoff:'}
          </span>
          <span className="truncate">{urgent.message}</span>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
        </div>

        <div className="flex items-center gap-2">
          {alerts.length > 1 && (
            <span className="text-[11px] text-amber-800/80 dark:text-amber-300 font-mono hidden sm:inline">
              +{alerts.length - 1} more
            </span>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-amber-800/60 dark:text-amber-400 hover:text-amber-900 rounded hover:bg-amber-500/10 transition-colors"
            title="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
