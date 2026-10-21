import React, { useState } from 'react';
import { IntegrationSettings, ThemeMode } from '../types';
import { 
  X, 
  BookOpen, 
  GraduationCap, 
  Layers, 
  LayoutGrid, 
  Check, 
  RefreshCw, 
  CheckCircle2, 
  ChevronRight,
  SlidersHorizontal,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';

interface Props {
  settings: IntegrationSettings;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSettings: (newSettings: IntegrationSettings) => void;
  onOpenMoodleModal: () => void;
  onTriggerSyncAll: () => Promise<void>;
}

export const IntegrationsModal: React.FC<Props> = ({
  settings,
  isOpen,
  onClose,
  onUpdateSettings,
  onOpenMoodleModal,
  onTriggerSyncAll,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleThemeChange = (newTheme: ThemeMode) => {
    onUpdateSettings({
      ...settings,
      theme: newTheme,
    });
  };

  const handleToggleClassroomCourse = (courseId: string) => {
    const updated = settings.classroom.selectedCourses.map((c) =>
      c.id === courseId ? { ...c, enabled: !c.enabled } : c
    );
    onUpdateSettings({
      ...settings,
      classroom: {
        ...settings.classroom,
        selectedCourses: updated,
      },
    });
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSuccessMsg(null);
    try {
      await onTriggerSyncAll();
      setSuccessMsg('All connected platforms synced successfully!');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs transition-opacity">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#d4d4d4] rounded-xl shadow-xl border border-[#e5e4e0] dark:border-neutral-800 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e7e3] dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f1f1ef] dark:bg-neutral-800 flex items-center justify-center text-[#474542] dark:text-neutral-300">
              <SlidersHorizontal className="w-5 h-5 opacity-80" />
            </div>
            <div>
              <h3 className="font-semibold text-[#37352f] dark:text-neutral-100 text-base">
                Settings & Connected Platforms
              </h3>
              <p className="text-xs text-[#787774] dark:text-neutral-400">
                Customize appearance, theme mode, and manage platform synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9c9a95] hover:text-[#37352f] dark:hover:text-neutral-200 rounded-lg hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {successMsg && (
            <div className="p-3 bg-[#eef4ee] border border-[#d7e5d6] rounded-lg text-[#2d5c41] flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* THEME SETTINGS (LIGHT / DARK / SYSTEM) */}
          <div className="p-4 rounded-xl border border-[#e5e4e0] dark:border-neutral-800 bg-[#fbfbfa] dark:bg-neutral-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-[#37352f] dark:text-neutral-100 text-xs">
                  Appearance & Theme
                </h4>
                <p className="text-[#787774] text-[11px] mt-0.5">
                  Choose between soft Notion light mode, deep dark mode, or system default
                </p>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-[#f1f1ef] dark:bg-neutral-800 text-[#787774]">
                Current: {settings.theme || 'light'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {/* Light Mode */}
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-all ${
                  settings.theme === 'light'
                    ? 'border-[#37352f] dark:border-white bg-white dark:bg-neutral-800 shadow-2xs font-semibold'
                    : 'border-[#e2e1dc] dark:border-neutral-700 bg-white/70 dark:bg-neutral-800/50 hover:bg-white text-[#787774] hover:text-[#37352f]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#fbf5e5] text-[#7d5d14] flex items-center justify-center border border-[#f0e3bf]">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-[#37352f] dark:text-neutral-200">Light Mode</div>
                  <div className="text-[10px] text-[#9c9a95]">Warm Off-White</div>
                </div>
                {settings.theme === 'light' && (
                  <span className="text-[10px] text-[#2d5c41] flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </button>

              {/* Dark Mode */}
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-all ${
                  settings.theme === 'dark'
                    ? 'border-[#37352f] dark:border-white bg-white dark:bg-neutral-800 shadow-2xs font-semibold'
                    : 'border-[#e2e1dc] dark:border-neutral-700 bg-white/70 dark:bg-neutral-800/50 hover:bg-white text-[#787774] hover:text-[#37352f]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#241c2c] text-[#ccaee6] flex items-center justify-center border border-[#3f314c]">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-[#37352f] dark:text-neutral-200">Dark Mode</div>
                  <div className="text-[10px] text-[#9c9a95]">Notion Deep Slate</div>
                </div>
                {settings.theme === 'dark' && (
                  <span className="text-[10px] text-[#2d5c41] flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </button>

              {/* System Mode */}
              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center transition-all ${
                  settings.theme === 'system'
                    ? 'border-[#37352f] dark:border-white bg-white dark:bg-neutral-800 shadow-2xs font-semibold'
                    : 'border-[#e2e1dc] dark:border-neutral-700 bg-white/70 dark:bg-neutral-800/50 hover:bg-white text-[#787774] hover:text-[#37352f]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#f1f1ef] text-[#474542] dark:bg-neutral-700 dark:text-neutral-300 flex items-center justify-center border border-[#dedcd7]">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-[#37352f] dark:text-neutral-200">System Auto</div>
                  <div className="text-[10px] text-[#9c9a95]">Match Device OS</div>
                </div>
                {settings.theme === 'system' && (
                  <span className="text-[10px] text-[#2d5c41] flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-[#787774] uppercase tracking-wider pt-1">
            Connected Platforms & Sync
          </div>

          {/* Moodle Card (Soft pastel peach) */}
          <div className="p-4 rounded-xl border border-[#f1dac9] bg-[#faf0e8]/50 dark:border-[#453023] dark:bg-[#2a1e16]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#faf0e8] text-[#8a4e1d] flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4 opacity-80" />
                </div>
                <div>
                  <div className="font-semibold text-[#37352f] dark:text-neutral-100 flex items-center gap-2">
                    Moodle LMS
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#faf0e8] text-[#8a4e1d] border border-[#f1dac9] font-medium">
                      {settings.moodle.selectedCourses.filter((c) => c.enabled).length} courses active
                    </span>
                  </div>
                  <div className="text-[11px] text-[#787774]">
                    {settings.moodle.instanceUrl || 'https://moodle.university.edu'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenMoodleModal();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#f1dac9] bg-white dark:bg-neutral-800 text-[#8a4e1d] dark:text-[#f0b58a] hover:bg-[#faf0e8] text-xs font-medium transition-colors"
              >
                <span>Configure Courses</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Google Classroom Card (Soft pastel sage) */}
          <div className="p-4 rounded-xl border border-[#d7e5d6] bg-[#eef4ee]/50 dark:border-[#274232] dark:bg-[#1a2920]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#eef4ee] text-[#2d5c41] flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4 opacity-80" />
                </div>
                <div>
                  <div className="font-semibold text-[#37352f] dark:text-neutral-100 flex items-center gap-2">
                    Google Classroom
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#eef4ee] text-[#2d5c41] border border-[#d7e5d6] font-medium">
                      Active
                    </span>
                  </div>
                  <div className="text-[11px] text-[#787774]">
                    {settings.classroom.email || 'student@school.edu'}
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-[#9c9a95]">
                {settings.classroom.lastSync ? `Synced ${new Date(settings.classroom.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </span>
            </div>

            {/* Courses selector */}
            <div className="bg-white/80 dark:bg-neutral-900/80 rounded-lg p-2.5 border border-[#d7e5d6] space-y-1.5">
              <div className="text-[11px] font-medium text-[#787774] uppercase tracking-wider">
                Enrolled Classroom Courses:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {settings.classroom.selectedCourses.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 p-1.5 rounded-md hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={c.enabled}
                      onChange={() => handleToggleClassroomCourse(c.id)}
                      className="w-3.5 h-3.5 rounded text-[#37352f] accent-[#448361] cursor-pointer"
                    />
                    <span className="truncate text-[#37352f] dark:text-neutral-200 font-medium">
                      {c.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Notion Card (Soft pastel warm stone) */}
          <div className="p-4 rounded-xl border border-[#dedcd7] bg-[#f2f1ee]/50 dark:border-neutral-800 dark:bg-neutral-900/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#f2f1ee] text-[#474542] flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4 opacity-80" />
                </div>
                <div>
                  <div className="font-semibold text-[#37352f] dark:text-neutral-100 flex items-center gap-2">
                    Notion Database
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#f2f1ee] text-[#474542] border border-[#dedcd7] font-medium">
                      Connected
                    </span>
                  </div>
                  <div className="text-[11px] text-[#787774]">
                    {settings.notion.databaseName || 'Life & Study OS'}
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-[#9c9a95]">
                Auto-sync on
              </span>
            </div>
          </div>

          {/* Trello Card (Soft pastel powder blue) */}
          <div className="p-4 rounded-xl border border-[#d0e2ee] bg-[#edf4f9]/50 dark:border-[#263c4d] dark:bg-[#182631]/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#edf4f9] text-[#275c7d] flex items-center justify-center font-bold">
                  <LayoutGrid className="w-4 h-4 opacity-80" />
                </div>
                <div>
                  <div className="font-semibold text-[#37352f] dark:text-neutral-100 flex items-center gap-2">
                    Trello Boards
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#edf4f9] text-[#275c7d] border border-[#d0e2ee] font-medium">
                      Connected
                    </span>
                  </div>
                  <div className="text-[11px] text-[#787774]">
                    {settings.trello.boardName || 'Senior Capstone Sprint Board'}
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-[#9c9a95]">
                Pulls cards & due dates
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#e8e7e3] dark:border-neutral-800 flex items-center justify-between bg-[#fbfbfa] dark:bg-neutral-900/40">
          <div className="text-[11px] text-[#787774] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2d5c41]" />
            <span>Multi-platform live sync active</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-[#e2e1dc] dark:border-neutral-700 hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 font-medium text-xs transition-colors"
            >
              Close
            </button>
            <button
              disabled={isSyncing}
              onClick={handleSyncAll}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#37352f] hover:bg-[#272623] text-white font-medium text-xs shadow-2xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync All Integrations'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
