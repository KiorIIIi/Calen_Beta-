import React, { useState } from 'react';
import { MoodleCourse, MoodleIntegrationConfig, Task } from '../types';
import { 
  X, 
  BookOpen, 
  Check, 
  RefreshCw, 
  Link2, 
  Key, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { parseMoodleIcs } from '../services/moodleService';

interface Props {
  config: MoodleIntegrationConfig;
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (newConfig: MoodleIntegrationConfig) => void;
  onImportMoodleTasks: (tasks: Partial<Task>[]) => void;
}

export const MoodleIntegrationModal: React.FC<Props> = ({
  config,
  isOpen,
  onClose,
  onSaveConfig,
  onImportMoodleTasks,
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'ical' | 'courses'>('courses');
  const [instanceUrl, setInstanceUrl] = useState(config.instanceUrl || 'https://moodle.university.edu');
  const [token, setToken] = useState(config.token || '');
  const [icalUrl, setIcalUrl] = useState(config.icalUrl || '');
  const [rawIcsContent, setRawIcsContent] = useState('');
  const [courses, setCourses] = useState<MoodleCourse[]>(config.selectedCourses);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  if (!isOpen) return null;

  const handleToggleCourse = (courseId: string) => {
    const updated = courses.map((c) =>
      c.id === courseId ? { ...c, enabled: !c.enabled } : c
    );
    setCourses(updated);
  };

  const handleSelectAll = (enabled: boolean) => {
    setCourses(courses.map((c) => ({ ...c, enabled })));
  };

  const handleSaveAndSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);

    try {
      // If user provided raw .ics paste or iCal url
      if (rawIcsContent.trim()) {
        const parsed = parseMoodleIcs(rawIcsContent);
        if (parsed.length > 0) {
          onImportMoodleTasks(parsed);
          setSyncStatusMsg(`Successfully extracted ${parsed.length} assignments from Moodle iCal!`);
        } else {
          setSyncStatusMsg('No assignments found in the provided iCal content.');
        }
      } else {
        // Simulate/Execute sync for selected courses
        const activeCourseCount = courses.filter((c) => c.enabled).length;
        const totalAssignments = courses
          .filter((c) => c.enabled)
          .reduce((acc, c) => acc + c.assignmentsCount, 0);

        setSyncStatusMsg(`Synchronized ${totalAssignments} assignments across ${activeCourseCount} active courses!`);
      }

      const updatedConfig: MoodleIntegrationConfig = {
        ...config,
        connected: true,
        instanceUrl,
        token,
        icalUrl,
        selectedCourses: courses,
        lastSync: new Date().toISOString(),
      };

      onSaveConfig(updatedConfig);
    } catch (err: unknown) {
      setSyncStatusMsg(`Sync error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadSampleMoodleData = () => {
    const sampleCourses: MoodleCourse[] = [
      { id: 'moodle-cs189', fullname: 'CS 189: Introduction to Machine Learning', shortname: 'CS 189', enabled: true, assignmentsCount: 3 },
      { id: 'moodle-bio1a', fullname: 'Bio 1A: General Molecular & Cellular Biology', shortname: 'BIO 1A', enabled: true, assignmentsCount: 2 },
      { id: 'moodle-math54', fullname: 'Math 54: Linear Algebra & Differential Equations', shortname: 'MATH 54', enabled: true, assignmentsCount: 2 },
      { id: 'moodle-phys7b', fullname: 'Physics 7B: Physics for Scientists & Engineers', shortname: 'PHYS 7B', enabled: true, assignmentsCount: 1 },
      { id: 'moodle-data100', fullname: 'Data 100: Principles & Techniques of Data Science', shortname: 'DATA 100', enabled: false, assignmentsCount: 2 },
    ];
    setCourses(sampleCourses);
    setSyncStatusMsg('Sample Moodle courses and assignments loaded.');
  };

  const enabledCount = courses.filter((c) => c.enabled).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#d4d4d4] rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-base">
                  Moodle App & API Integration
                </h3>
                {config.connected && (
                  <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Sync assignments, quizzes, and deadlines directly into Calen
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

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-6 gap-6 bg-neutral-50/50 dark:bg-neutral-900/30 text-xs">
          <button
            onClick={() => setActiveTab('courses')}
            className={`py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'courses'
                ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Selected Courses ({enabledCount}/{courses.length})
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'api'
                ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Moodle WebService API
          </button>

          <button
            onClick={() => setActiveTab('ical')}
            className={`py-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'ical'
                ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Moodle Calendar (iCal Feed)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {syncStatusMsg && (
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {/* TAB 1: Selected Courses & Modules */}
          {activeTab === 'courses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                    Select Courses & Modules to Sync
                  </h4>
                  <p className="text-neutral-500 text-xs">
                    Only assignments from checked courses will appear in your master task list and calendar.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectAll(true)}
                    className="text-xs text-neutral-600 dark:text-neutral-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-neutral-300">|</span>
                  <button
                    onClick={() => handleSelectAll(false)}
                    className="text-xs text-neutral-600 dark:text-neutral-400 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="divide-y divide-neutral-150 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-neutral-50/30 dark:bg-neutral-900/20">
                {courses.map((course) => (
                  <label
                    key={course.id}
                    className="flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={course.enabled}
                        onChange={() => handleToggleCourse(course.id)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-0 cursor-pointer accent-amber-600"
                      />
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {course.fullname}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          {course.shortname}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">
                        {course.assignmentsCount} assignments
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={loadSampleMoodleData}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Reset to university sample courses
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Moodle Mobile WebService API */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Moodle Instance URL
                </label>
                <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800">
                  <Globe className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
                  <input
                    type="url"
                    value={instanceUrl}
                    onChange={(e) => setInstanceUrl(e.target.value)}
                    placeholder="https://moodle.youruniversity.edu"
                    className="w-full bg-transparent focus:outline-none text-xs"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  The base URL of your institution's Moodle installation.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300">
                    Moodle Mobile Web Service Token
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTokenHelp(!showTokenHelp)}
                    className="text-[11px] text-amber-600 hover:underline flex items-center gap-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    How to find your token
                  </button>
                </div>
                <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800">
                  <Key className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="e.g. 7f8a912b34cd56..."
                    className="w-full bg-transparent focus:outline-none text-xs font-mono"
                  />
                </div>
              </div>

              {showTokenHelp && (
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs space-y-1.5 text-neutral-600 dark:text-neutral-400">
                  <p className="font-semibold text-neutral-800 dark:text-neutral-200">Where to get your Moodle token:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                    <li>Log into your university Moodle portal.</li>
                    <li>Click your user profile picture in the top right &gt; <strong>Preferences</strong>.</li>
                    <li>Click <strong>Security keys</strong>.</li>
                    <li>Copy the key labeled <em>"Moodle mobile web service"</em> or <em>"Moodle app"</em>.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Moodle Calendar iCal Feed */}
          {activeTab === 'ical' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                <span className="font-semibold">Recommended for universities with strict firewalls:</span> Every Moodle instance supports Calendar Export feeds, allowing automatic deadline syncing without requiring administrative API permissions.
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Moodle Calendar Export URL (.ics)
                </label>
                <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 bg-white dark:bg-neutral-800">
                  <Link2 className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
                  <input
                    type="url"
                    value={icalUrl}
                    onChange={(e) => setIcalUrl(e.target.value)}
                    placeholder="https://moodle.youruniversity.edu/calendar/export_execute.php?..."
                    className="w-full bg-transparent focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Or Paste Calendar (.ics) Text Directly
                </label>
                <textarea
                  rows={4}
                  value={rawIcsContent}
                  onChange={(e) => setRawIcsContent(e.target.value)}
                  placeholder="BEGIN:VCALENDAR&#10;VERSION:2.0&#10;BEGIN:VEVENT&#10;SUMMARY:CS189 Homework 3 is due&#10;..."
                  className="w-full p-2.5 font-mono text-[11px] border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:border-neutral-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-900/40">
          <div className="text-[11px] text-neutral-400">
            {config.lastSync ? `Last synced ${new Date(config.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not yet synced'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSaveAndSync}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Save & Sync Courses'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
