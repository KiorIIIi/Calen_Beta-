import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, ViewMode, IntegrationSettings } from './types';
import { INITIAL_TASKS, INITIAL_SETTINGS } from './services/seedData';
import { 
  loadSavedTasks, 
  saveTasks, 
  loadSavedSettings, 
  saveSettings, 
  subscribeToCrossTabSync,
  checkIncomingSyncPayload 
} from './services/crossDeviceSync';
import { 
  auth, 
  testConnection, 
  loginWithGoogle, 
  loginAnonymously, 
  logoutUser,
  subscribeToUserTasks, 
  saveTaskToFirestore, 
  deleteTaskFromFirestore,
  saveSettingsToFirestore,
  subscribeToUserSettings
} from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getUpcomingAlerts } from './services/notificationService';
import { Header } from './components/Header';
import { NotificationBanner } from './components/NotificationBanner';
import { MasterTaskList } from './components/MasterTaskList';
import { CalendarView } from './components/CalendarView';
import { TaskDetailModal } from './components/TaskDetailModal';
import { MoodleIntegrationModal } from './components/MoodleIntegrationModal';
import { IntegrationsModal } from './components/IntegrationsModal';
import { DeviceSyncModal } from './components/DeviceSyncModal';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadSavedTasks(INITIAL_TASKS));
  const [settings, setSettings] = useState<IntegrationSettings>(() => loadSavedSettings(INITIAL_SETTINGS));
  const [currentView, setCurrentView] = useState<ViewMode>('tasks');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Firebase auth & cloud sync status
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const isInitialSyncDone = useRef(false);

  // Modals state
  const [isMoodleModalOpen, setIsMoodleModalOpen] = useState(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
  const [isDeviceSyncModalOpen, setIsDeviceSyncModalOpen] = useState(false);

  // Test Firestore connection on boot
  useEffect(() => {
    testConnection().then((connected) => {
      setIsCloudSynced(connected);
    });
  }, []);

  // Firebase Authentication & Realtime Firestore sync
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setIsCloudSynced(true);

        // Subscribe to user tasks
        const unsubTasks = subscribeToUserTasks(
          user.uid,
          (firestoreTasks) => {
            if (firestoreTasks.length > 0) {
              setTasks(firestoreTasks);
              isInitialSyncDone.current = true;
            } else if (!isInitialSyncDone.current) {
              // Seed initial tasks if remote is brand new
              tasks.forEach((t) => saveTaskToFirestore(user.uid, t));
              isInitialSyncDone.current = true;
            }
          },
          () => {
            // Keep local fallback
          }
        );

        // Subscribe to user settings
        const unsubSettings = subscribeToUserSettings(user.uid, (remoteSettings) => {
          if (remoteSettings && remoteSettings.theme) {
            setSettings(remoteSettings);
          }
        });

        return () => {
          unsubTasks();
          unsubSettings();
        };
      } else {
        // Sign in anonymously to guarantee persistent cloud syncing without requiring manual Google account login
        loginAnonymously().catch(() => {});
      }
    });

    return () => unsubAuth();
  }, []);

  // Check if incoming device sync link was clicked
  useEffect(() => {
    const payload = checkIncomingSyncPayload();
    if (payload && payload.tasks && payload.tasks.length > 0) {
      if (window.confirm(`Found ${payload.tasks.length} synced tasks from another device! Load now?`)) {
        setTasks(payload.tasks);
        if (payload.settings) {
          setSettings(payload.settings);
        }
      }
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveSettings(settings);
    if (currentUser) {
      saveSettingsToFirestore(currentUser.uid, settings).catch(() => {});
    }
  }, [settings, currentUser]);

  // Cross-tab sync via BroadcastChannel
  useEffect(() => {
    const unsubscribe = subscribeToCrossTabSync((type, payload) => {
      if (type === 'TASKS_UPDATED' && Array.isArray(payload)) {
        setTasks(payload as Task[]);
      } else if (type === 'SETTINGS_UPDATED' && payload) {
        setSettings(payload as IntegrationSettings);
      }
    });
    return unsubscribe;
  }, []);

  // Synchronize HTML dark class with settings.theme (Light / Dark / System)
  useEffect(() => {
    const applyTheme = () => {
      const mode = settings.theme || 'light';
      let isDark = false;
      if (mode === 'dark') {
        isDark = true;
      } else if (mode === 'system') {
        isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    };

    applyTheme();

    if (settings.theme === 'system' && typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [settings.theme]);

  const handleToggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    setSettings((prev) => ({
      ...prev,
      theme: isCurrentlyDark ? 'light' : 'dark',
    }));
  };

  // Calculate upcoming deadline alerts
  const alerts = useMemo(() => getUpcomingAlerts(tasks), [tasks]);

  // Task operations (Firestore + Local)
  const handleAddTask = (newTaskData: Partial<Task>) => {
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: newTaskData.title || 'Untitled Task',
      dueDate: newTaskData.dueDate || new Date().toISOString().slice(0, 16),
      source: newTaskData.source || 'personal',
      courseName: newTaskData.courseName,
      courseCode: newTaskData.courseCode,
      moduleName: newTaskData.moduleName,
      externalUrl: newTaskData.externalUrl,
      status: newTaskData.status || 'todo',
      priority: newTaskData.priority || 'medium',
      checklist: newTaskData.checklist || [],
      notes: newTaskData.notes || '',
      tags: newTaskData.tags || [],
    };
    setTasks((prev) => [newTask, ...prev]);
    setSelectedTask(newTask);

    if (currentUser) {
      saveTaskToFirestore(currentUser.uid, newTask).catch(() => {});
    }
  };

  const handleAddTaskOnDate = (dateIso: string) => {
    handleAddTask({
      title: 'New Deadline',
      dueDate: dateIso,
      source: 'personal',
    });
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask);
    }
    if (currentUser) {
      saveTaskToFirestore(currentUser.uid, updatedTask).catch(() => {});
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
    if (currentUser) {
      deleteTaskFromFirestore(currentUser.uid, taskId).catch(() => {});
    }
  };

  // Moodle imports
  const handleImportMoodleTasks = (newMoodleTasks: Partial<Task>[]) => {
    const created: Task[] = newMoodleTasks.map((t) => ({
      id: t.id || `moodle-task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: t.title || 'Moodle Assignment',
      description: t.description || '',
      dueDate: t.dueDate || new Date().toISOString().slice(0, 16),
      source: 'moodle',
      courseName: t.courseName || 'Moodle Course',
      courseCode: t.courseCode,
      moduleName: t.moduleName,
      externalUrl: t.externalUrl,
      status: t.status || 'todo',
      priority: t.priority || 'high',
      checklist: [],
      notes: '',
      tags: ['Moodle'],
    }));

    setTasks((prev) => [...created, ...prev]);
    if (currentUser) {
      created.forEach((task) => saveTaskToFirestore(currentUser.uid, task).catch(() => {}));
    }
  };

  const handleImportWorkspace = (importedTasks: Task[], importedSettings: IntegrationSettings) => {
    setTasks(importedTasks);
    if (importedSettings) {
      setSettings(importedSettings);
    }
    if (currentUser) {
      importedTasks.forEach((t) => saveTaskToFirestore(currentUser.uid, t).catch(() => {}));
    }
  };

  const handleTriggerSyncAll = async () => {
    await new Promise((res) => setTimeout(res, 600));
    setSettings((prev) => ({
      ...prev,
      moodle: { ...prev.moodle, lastSync: new Date().toISOString() },
      classroom: { ...prev.classroom, lastSync: new Date().toISOString() },
      notion: { ...prev.notion, lastSync: new Date().toISOString() },
      trello: { ...prev.trello, lastSync: new Date().toISOString() },
    }));
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#121212] text-[#37352f] dark:text-[#e0e0e0] flex flex-col font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onSelectView={setCurrentView}
        settings={settings}
        alerts={alerts}
        onOpenMoodleModal={() => setIsMoodleModalOpen(true)}
        onOpenIntegrationsModal={() => setIsIntegrationsModalOpen(true)}
        onOpenDeviceSyncModal={() => setIsDeviceSyncModalOpen(true)}
        onQuickAddTask={() => handleAddTask({ title: 'New Assignment / Task' })}
        onSelectTask={setSelectedTask}
        onToggleTheme={handleToggleTheme}
        isCloudSynced={isCloudSynced}
        currentUser={currentUser}
        onLogin={loginWithGoogle}
        onLogout={logoutUser}
      />

      {/* Urgent Deadline Alert Banner */}
      <NotificationBanner alerts={alerts} onSelectTask={setSelectedTask} />

      {/* Main Content: TWO PRIMARY VIEWS ONLY (Master Task List & Calendar View) */}
      <main className="flex-1 pb-16">
        {currentView === 'tasks' ? (
          <MasterTaskList
            tasks={tasks}
            onSelectTask={setSelectedTask}
            onUpdateTask={handleUpdateTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
          />
        ) : (
          <CalendarView
            tasks={tasks}
            onSelectTask={setSelectedTask}
            onAddTaskOnDate={handleAddTaskOnDate}
          />
        )}
      </main>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />

      {/* Moodle LMS Integration Modal */}
      <MoodleIntegrationModal
        config={settings.moodle}
        isOpen={isMoodleModalOpen}
        onClose={() => setIsMoodleModalOpen(false)}
        onSaveConfig={(newConfig) =>
          setSettings((prev) => ({ ...prev, moodle: newConfig }))
        }
        onImportMoodleTasks={handleImportMoodleTasks}
      />

      {/* All Integrations Hub (Google Classroom, Notion, Trello) */}
      <IntegrationsModal
        settings={settings}
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
        onUpdateSettings={setSettings}
        onOpenMoodleModal={() => setIsMoodleModalOpen(true)}
        onTriggerSyncAll={handleTriggerSyncAll}
      />

      {/* Cross-Device Sync Modal */}
      <DeviceSyncModal
        tasks={tasks}
        settings={settings}
        isOpen={isDeviceSyncModalOpen}
        onClose={() => setIsDeviceSyncModalOpen(false)}
        onImportWorkspace={handleImportWorkspace}
      />
    </div>
  );
}
