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
  Volume2,
  Sun,
  Moon,
  Cloud,
  UserCheck
} from 'lucide-react';
import { UpcomingAlert, sendDesktopNotification, requestNotificationPermission } from '../services/notificationService';

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
  onToggleTheme: () => void;
  isCloudSynced: boolean;
  currentUser: any;
  onLogin: () => void;
  onLogout: () => void;
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
  onToggleTheme,
  isCloudSynced,
  currentUser,
  onLogin,
  onLogout,
}) => {
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  const activeMoodleCourses = settings.moodle.selectedCourses.filter((c) => c.enabled).length;
  const urgentCount = alerts.filter((a) => a.type === 'overdue' || a.type === 'due_soon').length;

  const isDarkMode = settings.theme === 'dark' || (settings.theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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
    <header className="sticky top-0 z-40 bg-[#fbfbfa]/95 dark:bg-[#151515]/95 backdrop-blur-md border-b border-[#e8e7e3] dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand & App Name */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 select-none group cursor-pointer" onClick={() => onSelectView('tasks')}>
            <div className="w-7 h-7 rounded-md bg-[#37352f] dark:bg-neutral-200 text-[#fbfbfa] dark:text-[#181818] flex items-center justify-center font-bold text-xs shadow-2xs">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-[#37352f] dark:text-neutral-100 text-base tracking-tight font-sans">
                calen
              </span>
              <span className="text-[10px] text-[#9c9a95] font-mono hidden sm:inline">
                notion-sync
              </span>
            </div>
          </div>

          {/* TWO PRIMARY VIEWS TOGGLE */}
          <nav className="flex items-center p-0.5 bg-[#f1f1ef] dark:bg-neutral-800/80 rounded-lg border border-[#e5e4e0] dark:border-neutral-700/60 text-xs font-medium">
            <button
              onClick={() => onSelectView('tasks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                currentView === 'tasks'
                  ? 'bg-white dark:bg-neutral-900 text-[#37352f] dark:text-neutral-100 shadow-2xs font-semibold'
                  : 'text-[#787774] dark:text-neutral-400 hover:text-[#37352f] dark:hover:text-neutral-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Master Task List</span>
            </button>

            <button
              onClick={() => onSelectView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                currentView === 'calendar'
                  ? 'bg-white dark:bg-neutral-900 text-[#37352f] dark:text-neutral-100 shadow-2xs font-semibold'
                  : 'text-[#787774] dark:text-neutral-400 hover:text-[#37352f] dark:hover:text-neutral-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar View</span>
            </button>
          </nav>
        </div>

        {/* Right Section: Soft pastel pills */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Cloud Firestore Status Pill */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border ${
              isCloudSynced
                ? 'border-[#d0e2ee] bg-[#edf4f9] text-[#275c7d] dark:border-[#263c4d] dark:bg-[#182631] dark:text-[#9bcbe6]'
                : 'border-[#dedcd7] bg-[#f2f1ee] text-[#787774]'
            }`}
            title="Firebase Firestore live cloud synchronization active"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Firestore</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#7eb897] animate-pulse" />
          </div>

          {/* Moodle Quick Pill (Soft pastel peach) */}
          <button
            onClick={onOpenMoodleModal}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-[#f1dac9] dark:border-[#453023] bg-[#faf0e8] dark:bg-[#2a1e16] text-[#8a4e1d] dark:text-[#f0b58a] hover:bg-[#f5e5d9] transition-colors"
            title="Configure Moodle courses & sync"
          >
            <BookOpen className="w-3.5 h-3.5 opacity-80" />
            <span>Moodle ({activeMoodleCourses})</span>
          </button>

          {/* Google Classroom Quick Pill (Soft pastel sage) */}
          <button
            onClick={onOpenIntegrationsModal}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-[#d7e5d6] dark:border-[#274232] bg-[#eef4ee] dark:bg-[#1a2920] text-[#2d5c41] dark:text-[#a3d4b6] hover:bg-[#e4ede4] transition-colors"
            title="Classroom connected"
          >
            <GraduationCap className="w-3.5 h-3.5 opacity-80" />
            <span>Classroom</span>
          </button>

          {/* Quick Light / Dark Mode Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 text-[#787774] dark:text-neutral-300 hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 rounded-md border border-transparent hover:border-[#e5e4e0] dark:hover:border-neutral-700 transition-colors"
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} mode`}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-[#e8c76b]" /> : <Moon className="w-4 h-4 text-[#5b3c77]" />}
          </button>

          {/* Settings / All Integrations Hub */}
          <button
            onClick={onOpenIntegrationsModal}
            className="p-1.5 text-[#787774] dark:text-neutral-300 hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 rounded-md border border-transparent hover:border-[#e5e4e0] dark:hover:border-neutral-700 transition-colors"
            title="Settings (Theme, Moodle, Classroom, Notion, Trello)"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Cross-Device Sync Button (Soft pastel lavender) */}
          <button
            onClick={onOpenDeviceSyncModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-[#ded5e9] dark:border-[#3f314c] bg-[#f4f1f8] dark:bg-[#241c2c] text-[#5b3c77] dark:text-[#ccaee6] hover:bg-[#ece6f3] transition-colors"
            title="Sync with mobile phone or other devices"
          >
            <Smartphone className="w-3.5 h-3.5 opacity-80" />
            <span className="hidden sm:inline">Sync Devices</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
              className={`relative p-1.5 rounded-md transition-colors ${
                urgentCount > 0
                  ? 'text-[#9c3434] bg-[#faebeb] dark:bg-[#2b1919] border border-[#f4cccc] dark:border-[#482828]'
                  : 'text-[#787774] dark:text-neutral-300 hover:bg-[#f1f1ef] dark:hover:bg-neutral-800'
              }`}
              title="Notifications & upcoming deadlines"
            >
              <Bell className="w-4 h-4" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1 min-w-3.5 h-3.5 rounded-full bg-[#faebeb] dark:bg-[#381a1a] text-[#9c3434] dark:text-[#f29b9b] border border-[#f4cccc] dark:border-[#522929] text-[9px] font-bold flex items-center justify-center">
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotificationsMenu && (
              <div 
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-lg border border-[#e5e4e0] dark:border-neutral-800 p-3 z-50 animate-in fade-in slide-in-from-top-1 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#e8e7e3] dark:border-neutral-800">
                  <div className="font-semibold text-[#37352f] dark:text-neutral-100 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[#787774]" />
                    <span>Deadlines & Reminders ({alerts.length})</span>
                  </div>
                  <button
                    onClick={handleEnableDesktopAlerts}
                    className="text-[11px] text-[#5b3c77] dark:text-[#ccaee6] hover:underline flex items-center gap-1"
                  >
                    <Volume2 className="w-3 h-3" />
                    Enable Push
                  </button>
                </div>

                <div className="py-2 max-h-72 overflow-y-auto space-y-2">
                  {alerts.length === 0 ? (
                    <div className="text-center py-6 text-[#9c9a95]">
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
                            ? 'bg-[#faebeb] border-[#f4cccc] text-[#9c3434] dark:bg-[#2b1919] dark:border-[#482828] dark:text-[#f29b9b]'
                            : alert.type === 'due_soon'
                            ? 'bg-[#fbf5e5] border-[#f0e3bf] text-[#7d5d14] dark:bg-[#292415] dark:border-[#42391e] dark:text-[#e8c76b]'
                            : 'bg-[#f8f7f5] border-[#e8e7e3] text-[#474542] dark:bg-neutral-800/60 dark:border-neutral-700 dark:text-neutral-200'
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

                <div className="pt-2 border-t border-[#e8e7e3] dark:border-neutral-800 text-[11px] text-[#9c9a95] text-center">
                  Calen notifies you automatically before assignment cutoffs.
                </div>
              </div>
            )}
          </div>

          {/* Quick Add Button */}
          <button
            onClick={onQuickAddTask}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#37352f] hover:bg-[#272623] dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-medium shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>
    </header>
  );
};
