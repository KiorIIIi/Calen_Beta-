import React, { useState } from 'react';
import { ViewMode, IntegrationSettings, Task } from '../types';
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Plus, 
  Smartphone, 
  Bell, 
  SlidersHorizontal, 
  BookOpen, 
  GraduationCap,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Volume2
} from 'lucide-react';
import { UpcomingAlert, sendDesktopNotification, requestNotificationPermission } from '../services/notificationService';
import { playReminderChime } from '../services/audioChime';

interface Props {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  settings: IntegrationSettings;
  alerts: UpcomingAlert[];
  onOpenMoodleModal: () => void;
  onOpenIntegrationsModal: () => void;
  onOpenDeviceSyncModal: () => void;
  onQuickAddTask: () => void;
  onSelectTask: (task: Task) => void;
}

export const Header: React.FC<Props> = ({
  currentView,
  onSelectView,
  settings,
  alerts,
  onOpenMoodleModal,
  onOpenIntegrationsModal,
  onOpenDeviceSyncModal,
  onQuickAddTask,
  onSelectTask,
}) => {
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  const activeMoodleCourses = settings.moodle.selectedCourses.filter((c) => c.enabled).length;
  const urgentCount = alerts.filter((a) => a.type === 'overdue' || a.type === 'due_soon').length;

  const handleEnableDesktopAlerts = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      sendDesktopNotification(
        'Calen Notifications Active',
        `You have ${alerts.length} upcoming assignment deadlines monitored.`
      );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand & Notion-style App Name */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 select-none group cursor-pointer" onClick={() => onSelectView('tasks')}>
            <div className="w-7 h-7 rounded-md bg-[#2e2e2e] dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-xs shadow-xs">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-base tracking-tight font-sans">
                calen
              </span>
              <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                notion-sync
              </span>
            </div>
          </div>

          {/* TWO PRIMARY VIEWS TOGGLE (Explicitly requested by user) */}
          <nav className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 text-xs font-medium">
            <button
              onClick={() => onSelectView('tasks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                currentView === 'tasks'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Master Task List</span>
            </button>

            <button
              onClick={() => onSelectView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                currentView === 'calendar'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar View</span>
            </button>
          </nav>
        </div>

        {/* Right Section: Integrations pills, Device Sync, Notifications, + New Task */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Moodle Quick Pill */}
          <button
            onClick={onOpenMoodleModal}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-amber-200/90 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 transition-colors"
            title="Configure Moodle courses & sync"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Moodle ({activeMoodleCourses})</span>
          </button>

          {/* Google Classroom Quick Pill */}
          <button
            onClick={onOpenIntegrationsModal}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-emerald-200/90 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/70 transition-colors"
            title="Classroom connected"
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Classroom</span>
          </button>

          {/* All Integrations Hub */}
          <button
            onClick={onOpenIntegrationsModal}
            className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition-colors"
            title="Integration Settings (Moodle, Classroom, Notion, Trello)"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Cross-Device Sync Button */}
          <button
            onClick={onOpenDeviceSyncModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100/70 transition-colors"
            title="Sync with mobile phone or other devices"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Sync Devices</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
              className={`relative p-1.5 rounded-md transition-colors ${
                urgentCount > 0
                  ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title="Notifications & upcoming deadlines"
            >
              <Bell className="w-4 h-4" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotificationsMenu && (
              <div 
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-3 z-50 animate-in fade-in slide-in-from-top-1 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b border-neutral-150 dark:border-neutral-800">
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Deadlines & Reminders ({alerts.length})</span>
                  </div>
                  <button
                    onClick={handleEnableDesktopAlerts}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Volume2 className="w-3 h-3" />
                    Enable Push
                  </button>
                </div>

                <div className="py-2 max-h-72 overflow-y-auto space-y-2">
                  {alerts.length === 0 ? (
                    <div className="text-center py-6 text-neutral-400">
                      No urgent deadlines right now. You are all caught up!
                    </div>
                  ) : (
                    alerts.map((alert, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          onSelectTask(alert.task);
                          setShowNotificationsMenu(false);
                        }}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all hover:translate-x-0.5 ${
                          alert.type === 'overdue'
                            ? 'bg-rose-50/70 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200'
                            : alert.type === 'due_soon'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-800 dark:bg-neutral-800/60 dark:border-neutral-700 dark:text-neutral-200'
                        }`}
                      >
                        <div className="font-medium truncate">{alert.task.title}</div>
                        <div className="text-[11px] opacity-80 mt-0.5 flex items-center justify-between">
                          <span>{alert.task.courseCode || alert.task.courseName || alert.task.source}</span>
                          <span className="font-semibold">
                            {alert.type === 'overdue' ? 'Overdue!' : alert.type === 'due_soon' ? 'Due soon' : 'Due today'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-150 dark:border-neutral-800 text-[11px] text-neutral-400 text-center">
                  Calen notifies you automatically before assignment cutoffs.
                </div>
              </div>
            )}
          </div>

          {/* Quick Add Button */}
          <button
            onClick={onQuickAddTask}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-medium shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>
    </header>
  );
};
