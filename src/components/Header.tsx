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
  Cloud
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
  currentUser,
  onLogin,
  onLogout,
}) => {
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);

  const activeMoodleCourses = settings.moodle.selectedCourses.filter((c) => c.enabled).length;
  const urgentCount = alerts.filter((a) => a.type === 'overdue' || a.type === 'due_soon').length;

  const isDarkMode =
    settings.theme === 'dark' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

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
    <header className="sticky top-0 z-40 bg-[#fbfbfa]/95 dark:bg-[#191919]/95 backdrop-blur-md border-b border-[#e8e7e3] dark:border-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        {/* Brand & Primary View Switcher */}
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="flex items-center gap-2 select-none cursor-pointer shrink-0"
            onClick={() => onSelectView('tasks')}
          >
            <div className="w-7 h-7 rounded-md bg-[#37352f] dark:bg-[#e5e5e0] text-[#fbfbfa] dark:text-[#191919] flex items-center justify-center font-bold text-xs shadow-2xs">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <span className="font-semibold text-[#37352f] dark:text-[#ececec] text-base tracking-tight whitespace-nowrap">
              calen
            </span>
          </div>

          {/* TWO PRIMARY VIEWS TOGGLE */}
          <nav className="flex items-center p-0.5 bg-[#f1f1ef] dark:bg-[#242424] rounded-lg border border-[#e5e4e0] dark:border-[#333333] text-xs font-medium shrink-0">
            <button
              onClick={() => onSelectView('tasks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                currentView === 'tasks'
                  ? 'bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#f0f0f0] shadow-2xs font-semibold'
                  : 'text-[#787774] dark:text-[#9b9b9b] hover:text-[#37352f] dark:hover:text-[#e0e0e0]'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Master Task List</span>
            </button>

            <button
              onClick={() => onSelectView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
                currentView === 'calendar'
                  ? 'bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#f0f0f0] shadow-2xs font-semibold'
                  : 'text-[#787774] dark:text-[#9b9b9b] hover:text-[#37352f] dark:hover:text-[#e0e0e0]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Calendar View</span>
            </button>
          </nav>
        </div>

        {/* Right Section: Single-line nowrap pills & actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Cloud Firestore Status / Google Sign-In Button */}
          {currentUser ? (
            <button
              onClick={() => {
                if (window.confirm(`Signed in as ${currentUser.email || 'Google User'}. Sign out of Cloud Sync?`)) {
                  onLogout();
                }
              }}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#d0e2ee] bg-[#edf4f9] text-[#275c7d] dark:border-[#293d4d] dark:bg-[#1a2631] dark:text-[#a2cde8] hover:opacity-90 transition-opacity whitespace-nowrap"
              title={`Cloud synced with Firestore (${currentUser.email || 'Connected'})`}
            >
              <Cloud className="w-3.5 h-3.5 shrink-0" />
              <span>Cloud Synced</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#7eb897] shrink-0" />
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#e2e1dc] bg-[#f5f4f1] text-[#5e5c58] dark:border-[#333333] dark:bg-[#242424] dark:text-[#c7c7c7] hover:bg-[#eae8e3] dark:hover:bg-[#2d2d2d] transition-colors whitespace-nowrap"
              title="Sign in with Google to sync tasks to Firebase Cloud Firestore"
            >
              <Cloud className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <span>Cloud Sync</span>
            </button>
          )}

          {/* Moodle Quick Pill (Soft pastel peach) */}
          <button
            onClick={onOpenMoodleModal}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#f1dac9] bg-[#faf0e8] text-[#8a4e1d] dark:border-[#473224] dark:bg-[#2a1f18] dark:text-[#edb68c] hover:bg-[#f5e5d9] dark:hover:bg-[#34261d] transition-colors whitespace-nowrap"
            title="Configure Moodle courses & sync"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <span>Moodle ({activeMoodleCourses})</span>
          </button>

          {/* Google Classroom Quick Pill (Soft pastel sage) */}
          <button
            onClick={onOpenIntegrationsModal}
            className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#d7e5d6] bg-[#eef4ee] text-[#2d5c41] dark:border-[#294233] dark:bg-[#1a2820] dark:text-[#9ed1b2] hover:bg-[#e4ede4] dark:hover:bg-[#213328] transition-colors whitespace-nowrap"
            title="Classroom connected"
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <span>Classroom</span>
          </button>

          {/* Cross-Device Sync Button (Soft pastel lavender) */}
          <button
            onClick={onOpenDeviceSyncModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#ded5e9] bg-[#f4f1f8] text-[#5b3c77] dark:border-[#3d304b] dark:bg-[#231c2b] dark:text-[#cbb0e6] hover:bg-[#ece6f3] dark:hover:bg-[#2c2336] transition-colors whitespace-nowrap"
            title="Sync with mobile phone or other devices"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <span>Sync Devices</span>
          </button>

          {/* Quick Light / Dark Mode Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 text-[#787774] dark:text-[#b0b0b0] hover:bg-[#f1f1ef] dark:hover:bg-[#282828] rounded-md border border-transparent hover:border-[#e5e4e0] dark:hover:border-[#363636] transition-colors shrink-0"
            title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} mode`}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-[#e8c76b]" /> : <Moon className="w-4 h-4 text-[#5b3c77]" />}
          </button>

          {/* Settings / All Integrations Hub */}
          <button
            onClick={onOpenIntegrationsModal}
            className="p-1.5 text-[#787774] dark:text-[#b0b0b0] hover:bg-[#f1f1ef] dark:hover:bg-[#282828] rounded-md border border-transparent hover:border-[#e5e4e0] dark:hover:border-[#363636] transition-colors shrink-0"
            title="Settings (Theme, Moodle, Classroom, Notion, Trello)"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Notifications Bell */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
              className={`relative p-1.5 rounded-md transition-colors ${
                urgentCount > 0
                  ? 'text-[#9c3434] bg-[#faebeb] border border-[#f4cccc] dark:bg-[#2b1919] dark:text-[#f29b9b] dark:border-[#482828]'
                  : 'text-[#787774] dark:text-[#b0b0b0] hover:bg-[#f1f1ef] dark:hover:bg-[#282828]'
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
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#202020] rounded-xl shadow-lg border border-[#e5e4e0] dark:border-[#333333] p-3 z-50 animate-in fade-in slide-in-from-top-1 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#e8e7e3] dark:border-[#2e2e2e]">
                  <div className="font-semibold text-[#37352f] dark:text-[#ececec] flex items-center gap-1.5">
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
                            : 'bg-[#f8f7f5] border-[#e8e7e3] text-[#474542] dark:bg-[#282828] dark:border-[#383838] dark:text-[#d4d4d4]'
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

                <div className="pt-2 border-t border-[#e8e7e3] dark:border-[#2e2e2e] text-[11px] text-[#9c9a95] text-center">
                  Calen notifies you automatically before assignment cutoffs.
                </div>
              </div>
            )}
          </div>

          {/* Quick Add Button */}
          <button
            onClick={onQuickAddTask}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#37352f] hover:bg-[#272623] dark:bg-[#ececec] dark:hover:bg-white text-white dark:text-[#191919] text-xs font-medium shadow-2xs transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>New Task</span>
          </button>
        </div>
      </div>
    </header>
  );
};
