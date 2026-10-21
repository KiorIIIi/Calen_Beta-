import React, { useState } from 'react';
import { IntegrationSettings } from '../types';
import { 
  X, 
  BookOpen, 
  GraduationCap, 
  Layers, 
  LayoutGrid, 
  Check, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  SlidersHorizontal
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#d4d4d4] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">
                Connected Platforms & Sync
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Manage live connections to Moodle, Google Classroom, Notion, and Trello
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Moodle Card */}
          <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    Moodle LMS
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-medium">
                      {settings.moodle.selectedCourses.filter((c) => c.enabled).length} courses active
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {settings.moodle.instanceUrl || 'https://moodle.university.edu'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenMoodleModal();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-neutral-800 text-amber-900 dark:text-amber-200 hover:bg-amber-50 text-xs font-medium transition-colors"
              >
                <span>Configure Courses</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Google Classroom Card */}
          <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    Google Classroom
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-medium">
                      Active
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {settings.classroom.email || 'student@school.edu'}
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-neutral-400">
                {settings.classroom.lastSync ? `Synced ${new Date(settings.classroom.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </span>
            </div>

            {/* Courses selector */}
            <div className="bg-white/80 dark:bg-neutral-900/80 rounded-lg p-2.5 border border-emerald-200/60 dark:border-emerald-900/40 space-y-1.5">
              <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Enrolled Classroom Courses:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {settings.classroom.selectedCourses.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={c.enabled}
                      onChange={() => handleToggleClassroomCourse(c.id)}
                      className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                    />
                    <span className="truncate text-neutral-800 dark:text-neutral-200 font-medium">
                      {c.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Notion Card */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    Notion Database
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                      Connected
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {settings.notion.databaseName || 'Life & Study OS'}
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-neutral-400">
                Auto-sync on
              </span>
            </div>
          </div>

          {/* Trello Card */}
          <div className="p-4 rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400 flex items-center justify-center font-bold">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    Trello Boards
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 font-medium">
                      Connected
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {settings.trello.boardName || 'Senior Capstone Sprint Board'}
                  </div>
                </div>
              </div>

              <span className="text-[11px] text-neutral-400">
                Pulls cards & due dates
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-900/40">
          <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Multi-platform live sync active</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium text-xs transition-colors"
            >
              Close
            </button>
            <button
              disabled={isSyncing}
              onClick={handleSyncAll}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
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
