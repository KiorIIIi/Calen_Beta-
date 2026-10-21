import React, { useState } from 'react';
import { UpcomingAlert } from '../services/notificationService';
import { Clock, X, ChevronRight, AlertCircle } from 'lucide-react';
import { Task } from '../types';

interface Props {
  alerts: UpcomingAlert[];
  onSelectTask: (task: Task) => void;
}

export const NotificationBanner: React.FC<Props> = ({ alerts, onSelectTask }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || alerts.length === 0) return null;

  const urgent = alerts[0];

  return (
    <div className="bg-[#faf6eb] dark:bg-[#232018] border-b border-[#eedeb8] dark:border-[#423920] px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div 
          onClick={() => onSelectTask(urgent.task)}
          className="flex items-center gap-2.5 cursor-pointer hover:underline text-[#735515] dark:text-[#ebd69d] truncate flex-1"
        >
          {urgent.type === 'overdue' ? (
            <AlertCircle className="w-4 h-4 text-[#a83b3b] shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-[#8f681a] shrink-0" />
          )}
          <span className="font-semibold shrink-0">
            {urgent.type === 'overdue' ? 'Overdue Deadline:' : 'Upcoming Cutoff:'}
          </span>
          <span className="truncate">{urgent.message}</span>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
        </div>

        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          {alerts.length > 1 && (
            <span className="text-[11px] text-[#8f681a] dark:text-[#ebd69d] font-mono hidden sm:inline opacity-85 whitespace-nowrap">
              +{alerts.length - 1} more
            </span>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-[#8f681a] dark:text-[#ebd69d] hover:bg-[#ebdcb3]/60 dark:hover:bg-[#3d3319] rounded transition-colors shrink-0"
            title="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
