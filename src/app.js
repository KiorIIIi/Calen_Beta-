import { dayKey, groupByDeadline } from './deadlines.js';
import {
  GOOGLE_LOGIN_ENABLED,
  googleSignIn,
  getAccessToken,
  setInMemoryAccessToken,
  logoutUser,
  subscribeAuth,
  subscribeUserWorkspace,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  saveMoodleCoursesToFirestore,
  saveSettingsToFirestore,
  seedWorkspaceToFirestore,
  fetchGoogleCalendarEvents,
  upsertGoogleCalendarEvent,
  deleteGoogleCalendarEvent
} from './firebase.js';

const STORAGE_KEYS = {
  TASKS: 'calen_html_tasks_v2',
  COURSES: 'calen_html_moodle_courses_v2',
  CLASSROOM_COURSES: 'calen_html_classroom_courses_v2',
  SETTINGS: 'calen_html_settings_v2',
  UPDATED_AT: 'calen_html_updated_at_v2'
};

const CLIENT_ID = `client-${Math.random().toString(36).slice(2, 10)}`;

function offsetDateISO(daysOffset, hours = 23, minutes = 59) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const DEFAULT_MOODLE_COURSES = [
  {
    id: 'moodle-cs189',
    code: 'CS 189',
    name: 'Introduction to Machine Learning',
    instructor: 'Prof. J. Shewchuk',
    term: 'Fall Semester',
    synced: true,
    assignments: [
      {
        id: 'mdl-task-cs189-1',
        title: 'Problem Set 4: Neural Networks Backpropagation Derivation',
        priority: 'urgent',
        status: 'in_progress',
        source: 'moodle',
        course: 'CS 189',
        dueDate: offsetDateISO(1, 15, 59),
        description: 'Submit PDF writeup + Jupyter notebook via Moodle Assignment dropbox.',
        subtasks: [
          { id: 's1', title: 'Derive matrix gradients for layer L', completed: true },
          { id: 's2', title: 'Implement vectorized ReLU backward pass', completed: true },
          { id: 's3', title: 'Run CIFAR-10 validation accuracy benchmark', completed: false },
          { id: 's4', title: 'Export LaTeX PDF and upload to Moodle', completed: false }
        ]
      },
      {
        id: 'mdl-task-cs189-2',
        title: 'Quiz 6: Support Vector Machines & Kernel Trick',
        priority: 'medium',
        status: 'todo',
        source: 'moodle',
        course: 'CS 189',
        dueDate: offsetDateISO(5, 17, 0),
        description: 'Timed 45-minute quiz on Moodle Quiz module.',
        subtasks: [
          { id: 's5', title: 'Review dual formulation lecture notes', completed: false },
          { id: 's6', title: 'Complete practice quiz on Moodle', completed: false }
        ]
      }
    ]
  },
  {
    id: 'moodle-bio1a',
    code: 'BIO 1A',
    name: 'General Biology & Molecular Lab',
    instructor: 'Dr. M. Doudna',
    term: 'Fall Semester',
    synced: true,
    assignments: [
      {
        id: 'mdl-task-bio1a-1',
        title: 'Lab Report 2: PCR Amplification & Gel Electrophoresis',
        priority: 'high',
        status: 'todo',
        source: 'moodle',
        course: 'BIO 1A',
        dueDate: offsetDateISO(3, 10, 0),
        description: 'Include annotated gel image, standard curve plot, and error analysis.',
        subtasks: [
          { id: 'b1', title: 'Label base-pair ladder lanes on gel photo', completed: true },
          { id: 'b2', title: 'Write discussion of non-specific bands', completed: false },
          { id: 'b3', title: 'Submit Turnitin check on Moodle', completed: false }
        ]
      }
    ]
  },
  {
    id: 'moodle-econ100b',
    code: 'ECON 100B',
    name: 'Macroeconomic Analysis & Policy',
    instructor: 'Prof. R. Olney',
    term: 'Fall Semester',
    synced: true,
    assignments: [
      {
        id: 'mdl-task-econ-1',
        title: 'Empirical Project: Federal Reserve Monetary Policy Data',
        priority: 'medium',
        status: 'in_progress',
        source: 'moodle',
        course: 'ECON 100B',
        dueDate: offsetDateISO(6, 23, 59),
        description: 'Download FRED CPI series and plot IS-LM response curves.',
        subtasks: [
          { id: 'e1', title: 'Pull quarterly FRED inflation dataset', completed: true },
          { id: 'e2', title: 'Draft 2-page policy memo', completed: false }
        ]
      }
    ]
  },
  {
    id: 'moodle-hist120',
    code: 'HIST 120',
    name: 'Seminar in Modern European History',
    instructor: 'Prof. C. Hesse',
    term: 'Fall Semester',
    synced: false,
    assignments: [
      {
        id: 'mdl-task-hist-1',
        title: 'Primary Source Response: 1848 Pamphlets Archive',
        priority: 'low',
        status: 'todo',
        source: 'moodle',
        course: 'HIST 120',
        dueDate: offsetDateISO(8, 18, 0),
        description: '600-word reflection uploaded to Moodle forum.',
        subtasks: []
      }
    ]
  }
];

const DEFAULT_CLASSROOM_COURSES = [
  {
    id: 'classroom-aplit',
    code: 'AP-LIT',
    name: 'AP English Literature & Composition',
    instructor: 'Ms. K. Morrison',
    synced: true,
    assignments: [
      {
        id: 'task-gc-1',
        title: 'Essay Draft: Analysis of "The Great Gatsby" Character Arc',
        priority: 'urgent',
        status: 'in_progress',
        source: 'google_classroom',
        course: 'AP-LIT',
        dueDate: offsetDateISO(0, 15, 59),
        description: 'Google Docs attachment required via Google Classroom.',
        subtasks: [
          { id: 'gc1', title: 'Outline thesis & 3 textual citations', completed: true },
          { id: 'gc2', title: 'Draft body paragraphs', completed: true },
          { id: 'gc3', title: 'Peer review edits', completed: false },
          { id: 'gc4', title: 'Turn in on Google Classroom', completed: false }
        ]
      }
    ]
  },
  {
    id: 'classroom-apush',
    code: 'AP-USH',
    name: 'AP United States History',
    instructor: 'Mr. D. Lin',
    synced: true,
    assignments: [
      {
        id: 'task-gc-2',
        title: 'DBQ Practice: Progressive Era Reform Movements',
        priority: 'high',
        status: 'todo',
        source: 'google_classroom',
        course: 'AP-USH',
        dueDate: offsetDateISO(2, 9, 0),
        description: 'Analyze 7 primary source documents and write full essay response.',
        subtasks: [
          { id: 'u1', title: 'Group documents into 3 buckets', completed: true },
          { id: 'u2', title: 'Write contextualization & thesis', completed: false },
          { id: 'u3', title: 'Complete HIPP sourcing for 4 docs', completed: false }
        ]
      }
    ]
  },
  {
    id: 'classroom-phys',
    code: 'PHYS 7A',
    name: 'Physics for Scientists and Engineers',
    instructor: 'Prof. A. Lanzara',
    synced: false,
    assignments: [
      {
        id: 'task-gc-3',
        title: 'Kinematics & Rotational Dynamics Problem Set',
        priority: 'medium',
        status: 'todo',
        source: 'google_classroom',
        course: 'PHYS 7A',
        dueDate: offsetDateISO(4, 17, 0),
        description: 'Upload worked solutions PDF to Google Classroom.',
        subtasks: []
      }
    ]
  }
];

function getInitialTasks() {
  const baseTasks = [
    {
      id: 'task-tr-1',
      title: 'Submit Capstone Budget Approval Form to Department',
      priority: 'urgent',
      status: 'todo',
      source: 'trello',
      course: 'Senior Capstone Sprint',
      dueDate: offsetDateISO(-1, 9, 0),
      description: 'Sign PDF and attach to Trello Sprint card.',
      subtasks: []
    },
    {
      id: 'task-nt-1',
      title: 'Synthesize Midterm Organic Chemistry Reaction Mechanisms',
      priority: 'medium',
      status: 'in_progress',
      source: 'notion',
      course: 'CHEM 3A Wiki',
      dueDate: offsetDateISO(4, 20, 0),
      description: 'Organize SN1, SN2, E1, E2 stereochemistry summary table in Notion.',
      subtasks: [
        { id: 'n1', title: 'Create reaction conditions comparison matrix', completed: true },
        { id: 'n2', title: 'Add practice flashcards', completed: false }
      ]
    },
    {
      id: 'task-pr-1',
      title: 'Submit FAFSA & Cal Grant Renewal Application',
      priority: 'high',
      status: 'completed',
      source: 'personal',
      course: 'Personal',
      dueDate: offsetDateISO(-2, 16, 0),
      description: 'Annual student financial aid deadline.',
      subtasks: []
    },
    {
      id: 'task-tr-2',
      title: 'Capstone: Finish Hardware Architecture Block Diagram',
      priority: 'low',
      status: 'in_progress',
      source: 'trello',
      course: 'Senior Capstone Sprint',
      dueDate: offsetDateISO(7, 14, 0),
      description: 'Export SVG diagram and attach to Trello card.',
      subtasks: []
    }
  ];

  const syncedMoodleTasks = DEFAULT_MOODLE_COURSES.filter((c) => c.synced).flatMap(
    (c) => c.assignments
  );
  const syncedClassroomTasks = DEFAULT_CLASSROOM_COURSES.filter((c) => c.synced).flatMap(
    (c) => c.assignments
  );

  return [...syncedMoodleTasks, ...syncedClassroomTasks, ...baseTasks];
}

// Application State
const state = {
  activeView: 'tasks',
  subView: 'deadline',
  calMode: 'month',
  calCursor: new Date(),
  priorityFilter: 'all',
  sourceFilter: 'all',
  courseFilter: 'all',
  statusFilter: 'all',
  searchQuery: '',
  sortBy: 'dueDate',
  reminderDismissed: false,
  editingTaskId: null,
  draftSubtasks: [],
  user: null,
  hasGcalToken: false,
  serverOnline: false,
  updatedAt: 0,
  unsubFirestore: null,
  pendingConfirmCallback: null,
  tasks: [],
  moodleCourses: [],
  classroomCourses: [],
  settings: {
    theme: 'dark',
    moodleUrl: 'https://moodle.university.edu',
    moodleIcalUrl: '',
    gcalIcalUrl: '',
    classroomIcalUrl: '',
    platforms: {
      moodle: true,
      google_calendar: true,
      google_classroom: true,
      notion: true,
      trello: true
    }
  }
};

const broadcast =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('calen_sync_channel') : null;

function loadLocalState() {
  try {
    if (window.location.hash.startsWith('#sync=')) {
      const encoded = window.location.hash.replace('#sync=', '');
      const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
      if (Array.isArray(decoded.tasks)) {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(decoded.tasks));
        localStorage.setItem(STORAGE_KEYS.UPDATED_AT, String(Date.now()));
      }
      window.history.replaceState(null, '', window.location.pathname);
    }

    const rawUpdatedAt = localStorage.getItem(STORAGE_KEYS.UPDATED_AT);
    state.updatedAt = rawUpdatedAt ? Number(rawUpdatedAt) || 0 : 0;

    const rawCourses = localStorage.getItem(STORAGE_KEYS.COURSES);
    state.moodleCourses = rawCourses
      ? JSON.parse(rawCourses)
      : structuredClone(DEFAULT_MOODLE_COURSES);

    const rawClassroom = localStorage.getItem(STORAGE_KEYS.CLASSROOM_COURSES);
    state.classroomCourses = rawClassroom
      ? JSON.parse(rawClassroom)
      : structuredClone(DEFAULT_CLASSROOM_COURSES);

    const rawTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    state.tasks = rawTasks ? JSON.parse(rawTasks) : getInitialTasks();

    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      state.settings = {
        ...state.settings,
        ...parsed,
        platforms: { ...state.settings.platforms, ...(parsed.platforms || {}) }
      };
    }
  } catch (e) {
    console.warn('Fallback to default state:', e);
    state.moodleCourses = structuredClone(DEFAULT_MOODLE_COURSES);
    state.classroomCourses = structuredClone(DEFAULT_CLASSROOM_COURSES);
    state.tasks = getInitialTasks();
  }
}

async function pushWorkspaceToServer() {
  try {
    const res = await fetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        updatedAt: state.updatedAt,
        tasks: state.tasks,
        moodleCourses: state.moodleCourses,
        classroomCourses: state.classroomCourses,
        settings: state.settings
      })
    });
    if (res.ok) {
      state.serverOnline = true;
      renderWorkspaceShell();
    }
  } catch {
    state.serverOnline = false;
    renderWorkspaceShell();
  }
}

async function pullWorkspaceFromServer() {
  try {
    const res = await fetch('/api/workspace', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    state.serverOnline = true;
    const ws = data?.workspace;
    if (ws && Array.isArray(ws.tasks)) {
      if (!state.updatedAt || (ws.updatedAt && ws.updatedAt >= state.updatedAt)) {
        state.tasks = ws.tasks;
        if (Array.isArray(ws.moodleCourses) && ws.moodleCourses.length > 0) {
          state.moodleCourses = ws.moodleCourses;
        }
        if (Array.isArray(ws.classroomCourses) && ws.classroomCourses.length > 0) {
          state.classroomCourses = ws.classroomCourses;
        }
        if (ws.settings) {
          state.settings = {
            ...state.settings,
            ...ws.settings,
            platforms: { ...state.settings.platforms, ...(ws.settings.platforms || {}) }
          };
        }
        state.updatedAt = ws.updatedAt || Date.now();
        saveLocalState(false, false);
        renderAll();
      } else if (state.updatedAt > (ws.updatedAt || 0)) {
        // Client has newer offline edits made while away — push them up to server!
        await pushWorkspaceToServer();
      }
    } else {
      // Server database is empty — seed it from current client state
      if (!state.updatedAt) state.updatedAt = Date.now();
      await pushWorkspaceToServer();
    }
  } catch {
    state.serverOnline = false;
    renderWorkspaceShell();
  }
}

function initServerSync() {
  pullWorkspaceFromServer();

  // Real-time Server-Sent Events stream across localhost and https tunnel
  if (typeof EventSource !== 'undefined') {
    let es = null;
    const connectSse = () => {
      try {
        es = new EventSource('/api/events');
        es.onopen = () => {
          state.serverOnline = true;
          renderWorkspaceShell();
        };
        es.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'workspace_updated' && msg.clientId !== CLIENT_ID) {
              pullWorkspaceFromServer();
            }
          } catch {
            // ignore malformed frame
          }
        };
        es.onerror = () => {
          state.serverOnline = false;
          renderWorkspaceShell();
        };
      } catch {
        // Offline mode fallback
      }
    };
    connectSse();
  }

  window.addEventListener('online', () => {
    pullWorkspaceFromServer();
  });
}

function saveLocalState(broadcastUpdate = true, syncToServer = true) {
  if (syncToServer) {
    state.updatedAt = Date.now();
  }
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks));
  localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(state.moodleCourses));
  localStorage.setItem(STORAGE_KEYS.CLASSROOM_COURSES, JSON.stringify(state.classroomCourses));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
  localStorage.setItem(STORAGE_KEYS.UPDATED_AT, String(state.updatedAt));

  if (broadcastUpdate && broadcast) {
    broadcast.postMessage({
      tasks: state.tasks,
      moodleCourses: state.moodleCourses,
      classroomCourses: state.classroomCourses,
      settings: state.settings,
      updatedAt: state.updatedAt
    });
  }

  if (syncToServer) {
    pushWorkspaceToServer();
  }
}

function applyTheme() {
  const mode = state.settings.theme || 'dark';
  const prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark);

  document.documentElement.classList.toggle('dark', isDark);

  const iconEl = document.getElementById('theme-quick-icon');
  if (iconEl) {
    iconEl.innerHTML = isDark
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  }

  document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-theme-choice') === mode);
  });
}

// Badge & Formatting Helpers
const PRIORITY_META = {
  urgent: { label: 'Urgent', badgeClass: 'badge-rose', weight: 4 },
  high: { label: 'High', badgeClass: 'badge-peach', weight: 3 },
  medium: { label: 'Medium', badgeClass: 'badge-butter', weight: 2 },
  low: { label: 'Low', badgeClass: 'badge-stone', weight: 1 }
};

const SOURCE_META = {
  moodle: { label: 'Moodle', badgeClass: 'badge-peach' },
  google_calendar: { label: 'Google Calendar', badgeClass: 'badge-sky' },
  google_classroom: { label: 'Classroom', badgeClass: 'badge-sage' },
  notion: { label: 'Notion', badgeClass: 'badge-stone' },
  trello: { label: 'Trello', badgeClass: 'badge-sky' },
  personal: { label: 'Personal', badgeClass: 'badge-lavender' }
};

const STATUS_META = {
  todo: { label: 'To Do', badgeClass: 'badge-stone' },
  in_progress: { label: 'In Progress', badgeClass: 'badge-sky' },
  completed: { label: 'Completed', badgeClass: 'badge-sage' }
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDueDate(isoString) {
  if (!isoString) return { text: 'No deadline', isOverdue: false };
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return { text: 'No date', isOverdue: false };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((targetStart - todayStart) / 86400000);

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let dayStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  if (diffDays === 0) dayStr = 'Today';
  else if (diffDays === 1) dayStr = 'Tomorrow';
  else if (diffDays === -1) dayStr = 'Yesterday';

  return {
    text: `${dayStr}, ${timeStr}`,
    isOverdue: date < now
  };
}

function getVisibleTasks() {
  return state.tasks.filter((task) => {
    if (task.source !== 'personal' && state.settings.platforms[task.source] === false) {
      return false;
    }
    if (state.priorityFilter !== 'all' && task.priority !== state.priorityFilter) {
      return false;
    }
    if (state.sourceFilter !== 'all' && task.source !== state.sourceFilter) {
      return false;
    }
    if (state.courseFilter !== 'all' && task.course !== state.courseFilter) return false;
    if (state.statusFilter === 'pending' && task.status === 'completed') {
      return false;
    }
    if (state.statusFilter === 'completed' && task.status !== 'completed') {
      return false;
    }
    if (state.statusFilter === 'today') {
      if (dayKey(task.dueDate) !== dayKey(new Date())) return false;
    }
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      const hay = `${task.title} ${task.course || ''} ${task.source}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function sortTasks(list) {
  return [...list].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;

    if (state.sortBy === 'priority') {
      const diff =
        (PRIORITY_META[b.priority]?.weight || 0) - (PRIORITY_META[a.priority]?.weight || 0);
      if (diff !== 0) return diff;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (state.sortBy === 'source') {
      return a.source.localeCompare(b.source);
    }
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
}

// ============================================================================
//UNIVERSAL ICAL (.ICS) PARSER (RFC 5545 + LINE UNFOLDING + VALUE=DATE)
// ============================================================================
function parseIcsEvents(rawIcs, defaultSource = 'moodle', defaultCourse = 'iCal Sync') {
  if (!rawIcs || typeof rawIcs !== 'string') return [];
  // Unfold RFC 5545 folded lines
  const unfolded = rawIcs.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const events = [];

  blocks.forEach((rawBlock, i) => {
    const block = rawBlock.split('END:VEVENT')[0] || rawBlock;
    const getField = (name) => {
      const regex = new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'im');
      const m = block.match(regex);
      return m ? m[1].trim() : '';
    };

    const rawSummary = getField('SUMMARY')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\n/gi, ' ')
      .replace(/^\[Calen\]\s*/i, '');
    const rawDesc = getField('DESCRIPTION')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\n/gi, '\n');
    const rawCategories = getField('CATEGORIES').replace(/\\,/g, ',');
    const rawUid = getField('UID') || `${Date.now()}-${i}`;
    const dtStr = getField('DTEND') || getField('DTSTART') || getField('DUE');

    let dueDate = offsetDateISO(2, 23, 59);
    if (dtStr) {
      const cleanDt = dtStr.trim();
      if (/^\d{8}T\d{6}Z?$/i.test(cleanDt)) {
        const y = cleanDt.slice(0, 4);
        const mo = cleanDt.slice(4, 6);
        const da = cleanDt.slice(6, 8);
        const hr = cleanDt.slice(9, 11);
        const mi = cleanDt.slice(11, 13);
        const sc = cleanDt.slice(13, 15);
        const suffix = cleanDt.endsWith('Z') ? 'Z' : '';
        const parsed = new Date(`${y}-${mo}-${da}T${hr}:${mi}:${sc}${suffix}`);
        if (!Number.isNaN(parsed.getTime())) dueDate = parsed.toISOString();
      } else if (/^\d{8}$/.test(cleanDt)) {
        // VALUE=DATE (all-day deadline) -> set to 23:59 on that date
        const y = cleanDt.slice(0, 4);
        const mo = cleanDt.slice(4, 6);
        const da = cleanDt.slice(6, 8);
        const parsed = new Date(`${y}-${mo}-${da}T23:59:00`);
        if (!Number.isNaN(parsed.getTime())) dueDate = parsed.toISOString();
      }
    }

    const safeUid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `${Date.now()}-${i}`;
    const prefix =
      defaultSource === 'google_calendar'
        ? 'gcal'
        : defaultSource === 'google_classroom'
        ? 'gc-ical'
        : 'mdl-ical';

    events.push({
      id: `${prefix}-${safeUid}`,
      title: rawSummary || `${defaultCourse} Event #${i + 1}`,
      priority: defaultSource === 'google_calendar' ? 'medium' : 'high',
      status: 'todo',
      source: defaultSource,
      course: rawCategories || defaultCourse,
      dueDate,
      description: rawDesc || `Imported via ${defaultCourse} (.ics) feed`,
      ...(defaultSource === 'google_calendar' ? { gcalEventId: safeUid } : {}),
      subtasks: []
    });
  });

  return events;
}

function mergeImportedTasks(importedTasks) {
  let added = 0;
  let updated = 0;
  for (const item of importedTasks) {
    const existing = state.tasks.find(
      (t) =>
        t.id === item.id ||
        (item.gcalEventId && t.gcalEventId === item.gcalEventId) ||
        (t.source === item.source && t.title === item.title && dayKey(t.dueDate) === dayKey(item.dueDate))
    );
    if (existing) {
      existing.title = item.title;
      existing.dueDate = item.dueDate;
      if (item.description) existing.description = item.description;
      if (item.course) existing.course = item.course;
      updated++;
    } else {
      state.tasks.unshift(item);
      added++;
    }
  }
  return { added, updated };
}

// ============================================================================
// RENDERING
// ============================================================================
function renderAll() {
  applyTheme();
  renderWorkspaceShell();
  renderSettingsSyncStatus();
  renderReminderBanner();
  renderPriorityFocusBar();
  renderTasksSection();
  renderCalendarSection();
  renderGcalModalContent();
}

function renderSettingsSyncStatus() {
  const syncedCount = state.moodleCourses.filter((c) => c.synced).length;
  const moodleBtnLabel = document.getElementById('moodle-btn-label');
  if (moodleBtnLabel) {
    moodleBtnLabel.textContent = `Manage Courses (${syncedCount})`;
  }

  const classroomSyncedCount = state.classroomCourses.filter((c) => c.synced).length;
  const classroomBtnLabel = document.getElementById('classroom-btn-label');
  if (classroomBtnLabel) {
    classroomBtnLabel.textContent = `Manage Classes (${classroomSyncedCount})`;
  }

  const gcalSyncedCount = state.tasks.filter(
    (t) => t.source === 'google_calendar' || Boolean(t.gcalEventId)
  ).length;
  const gcalBtnLabel = document.getElementById('gcal-btn-label');
  if (gcalBtnLabel) {
    gcalBtnLabel.textContent =
      gcalSyncedCount > 0 ? `Sync Calendar (${gcalSyncedCount})` : 'Sync Calendar';
  }

  const modalCloudText = document.getElementById('modal-cloud-login-text');
  const syncSub = document.getElementById('sync-cloud-subtitle');
  const cloudBtn = document.getElementById('btn-modal-cloud-login');
  if (!GOOGLE_LOGIN_ENABLED) {
    if (cloudBtn) {
      cloudBtn.disabled = true;
      cloudBtn.setAttribute('aria-disabled', 'true');
    }
    if (modalCloudText) modalCloudText.textContent = 'Google Login (Unavailable)';
    if (syncSub) {
      syncSub.textContent = state.serverOnline
        ? 'Connected to Local Server DB — localhost, HTTPS tunnel, and offline cache are synced seamlessly.'
        : 'Offline Cache Active — viewing saved calendar data on this device. Will sync when server is reachable.';
    }
  } else if (state.user) {
    if (modalCloudText) modalCloudText.textContent = 'Sign out of Google';
    if (syncSub)
      syncSub.textContent = `Signed in as ${state.user.email} — live Firestore sync active`;
  } else {
    if (modalCloudText) modalCloudText.textContent = 'Sign in with Google';
    if (syncSub)
      syncSub.textContent =
        'Sign in with Google to sync tasks across devices and connect Google Calendar';
  }
}

function renderReminderBanner() {
  const banner = document.getElementById('reminder-banner');
  const textEl = document.getElementById('reminder-banner-text');
  const openBtn = document.getElementById('btn-open-reminder-task');
  if (!banner || !textEl || !openBtn) return;

  if (state.reminderDismissed) {
    banner.classList.add('hidden');
    return;
  }

  const pendingUrgent = state.tasks
    .filter((t) => t.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (pendingUrgent.length === 0) {
    banner.classList.add('hidden');
    return;
  }

  const topTask = pendingUrgent[0];
  const dueInfo = formatDueDate(topTask.dueDate);
  banner.classList.remove('hidden');
  textEl.innerHTML = `<strong>${
    dueInfo.isOverdue ? 'Past Due' : 'Next Deadline'
  }</strong> · ${escapeHtml(topTask.title)} · ${escapeHtml(
    topTask.course || SOURCE_META[topTask.source]?.label
  )} · ${escapeHtml(dueInfo.text)}`;

  openBtn.onclick = () => openTaskModal(topTask.id);
}

function renderPriorityFocusBar() {
  const bar = document.getElementById('priority-focus-bar');
  if (!bar) return;

  const activeTasks = state.tasks.filter((t) => t.status !== 'completed');
  const counts = {
    all: state.tasks.length,
    urgent: activeTasks.filter((t) => t.priority === 'urgent').length,
    high: activeTasks.filter((t) => t.priority === 'high').length,
    medium: activeTasks.filter((t) => t.priority === 'medium').length,
    low: activeTasks.filter((t) => t.priority === 'low').length
  };

  const items = [
    { key: 'all', label: 'All Priorities', tone: '' },
    { key: 'urgent', label: 'Urgent', tone: 'tone-urgent' },
    { key: 'high', label: 'High', tone: 'tone-high' },
    { key: 'medium', label: 'Medium', tone: 'tone-medium' },
    { key: 'low', label: 'Low', tone: 'tone-low' }
  ];

  bar.innerHTML = `
    <span class="priority-focus-label">Priority Focus</span>
    ${items
      .map((item) => {
        const isSelected = state.priorityFilter === item.key;
        const cls = [
          'prio-pill',
          item.tone,
          item.key === 'all' && isSelected ? 'active-all' : '',
          item.key !== 'all' && isSelected ? 'selected' : ''
        ]
          .filter(Boolean)
          .join(' ');
        return `
          <button type="button" class="${cls}" data-prio-filter="${item.key}">
            <span>${item.label}</span>
            <span class="prio-pill-count">${counts[item.key]}</span>
          </button>
        `;
      })
      .join('')}
  `;

  bar.querySelectorAll('[data-prio-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-prio-filter');
      state.priorityFilter = state.priorityFilter === val && val !== 'all' ? 'all' : val;
      renderAll();
    });
  });
}

function buildTableHtml(tasks) {
  if (tasks.length === 0) {
    return `
      <div style="padding:40px 16px;text-align:center;color:var(--text-secondary);border-bottom:1px solid var(--border-color);">
        No assignments match the current filter. Try clearing filters or adding a new task above.
      </div>
    `;
  }

  return `
    <div class="table-scroll">
      <table class="task-table">
        <thead>
          <tr>
            <th class="col-check">Done</th>
            <th class="col-title">Assignment</th>
            <th class="col-priority">Priority</th>
            <th class="col-source">Course · Platform</th>
            <th class="col-due">Due Date</th>
            <th class="col-status">Status</th>
            <th class="col-link">Edit</th>
          </tr>
        </thead>
        <tbody>
          ${tasks
            .map((task) => {
              const prio = PRIORITY_META[task.priority] || PRIORITY_META.medium;
              const src = SOURCE_META[task.source] || SOURCE_META.personal;
              const st = STATUS_META[task.status] || STATUS_META.todo;
              const due = formatDueDate(task.dueDate);
              const isDone = task.status === 'completed';
              const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
              const doneSub = subtasks.filter((s) => s.completed).length;

              const courseDisplay =
                task.course && task.course !== src.label
                  ? `${task.course} · ${src.label}`
                  : src.label;

              return `
                <tr class="task-row" data-row-id="${escapeHtml(task.id)}">
                  <td class="col-check" data-action="toggle-check" data-id="${escapeHtml(task.id)}">
                    <span class="check-circle ${isDone ? 'done' : ''}">
                      ${isDone ? '✓' : ''}
                    </span>
                  </td>
                  <td class="col-title">
                    <div class="task-title-wrap">
                      <span class="task-title-text ${isDone ? 'done' : ''}">${escapeHtml(
                        task.title
                      )}</span>
                      ${
                        subtasks.length > 0
                          ? `<span class="subtask-meta">· ${doneSub}/${subtasks.length}</span>`
                          : ''
                      }
                      ${
                        task.gcalEventId && task.source !== 'google_calendar'
                          ? `<span class="subtask-meta" title="Synced with Google Calendar">· GCal</span>`
                          : ''
                      }
                    </div>
                  </td>
                  <td class="col-priority" data-action="cycle-priority" data-id="${escapeHtml(
                    task.id
                  )}" title="Click to cycle priority level">
                    <span class="badge ${prio.badgeClass}">${prio.label}</span>
                  </td>
                  <td class="col-source">
                    <span class="source-text">${escapeHtml(courseDisplay)}</span>
                  </td>
                  <td class="col-due">
                    <div class="due-cell-inner ${due.isOverdue && !isDone ? 'overdue' : ''}">
                      <span>${escapeHtml(due.text)}</span>
                      ${due.isOverdue && !isDone ? `<span>· Late</span>` : ''}
                    </div>
                  </td>
                  <td class="col-status" data-action="cycle-status" data-id="${escapeHtml(
                    task.id
                  )}" title="Click to cycle status">
                    <span class="badge ${st.badgeClass}">${st.label}</span>
                  </td>
                  <td class="col-link">
                    <button type="button" class="hdr-btn hdr-btn-icon" style="width:28px;height:28px;" aria-label="Edit assignment">
                      ✎
                    </button>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function selectView(view) {
  state.activeView = view;
  document.querySelectorAll('[data-view]').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.getElementById('view-tasks').classList.toggle('hidden', view !== 'tasks');
  document.getElementById('view-calendar').classList.toggle('hidden', view !== 'calendar');
  document.getElementById('current-view-label').textContent = view === 'tasks' ? 'Tasks' : 'Calendar';
  if (view === 'calendar') renderCalendarSection();
}

function renderWorkspaceShell() {
  const date = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  document.getElementById('tasks-subtitle').textContent = `${date} · Your deadlines, in one place`;
  document.getElementById('workspace-account').textContent = state.user?.displayName || state.user?.email || 'Personal calendar';
  document.getElementById('workspace-account-status').textContent = state.serverOnline
    ? 'Live Server + Offline Sync'
    : 'Offline Device Cache';
  document.querySelectorAll('[data-source]').forEach((button) => {
    button.classList.toggle('active', button.dataset.source === state.sourceFilter);
    button.setAttribute('aria-pressed', String(button.dataset.source === state.sourceFilter));
  });
  const courses = [...new Set(state.tasks.map(task => task.course).filter(Boolean))].sort();
  if (state.courseFilter !== 'all' && !courses.includes(state.courseFilter)) state.courseFilter = 'all';
  const courseSelect = document.getElementById('filter-course');
  courseSelect.innerHTML = '<option value="all">All courses</option>' + courses.map(course => `<option value="${escapeHtml(course)}">${escapeHtml(course)}</option>`).join('');
  courseSelect.value = state.courseFilter;
}

function buildDeadlineHtml(tasks) {
  if (!tasks.length) {
    const empty = state.tasks.length === 0;
    return `<div class="deadline-empty"><h2>${empty ? 'A little clarity starts here.' : 'No tasks match these filters.'}</h2><p>${empty ? 'Add your first task to keep your next deadline in sight.' : 'Try another search or clear your filters to see all tasks.'}</p><button type="button" class="btn-primary" ${empty ? 'data-add-first' : 'data-clear-filters'}>${empty ? 'Add task' : 'Clear filters'}</button></div>`;
  }
  return Object.entries(groupByDeadline(tasks)).filter(([, list]) => list.length).map(([label, list]) => {
    const rows = list.map(task => {
      const done = task.status === 'completed';
      const due = task.dueDate && dayKey(task.dueDate) ? new Date(task.dueDate) : null;
      const today = due && dayKey(due) === dayKey(new Date());
      const dueLabel = due ? `${today ? 'Today' : due.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })}, ${due.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}` : 'No deadline';
      const source = SOURCE_META[task.source] || SOURCE_META.personal;
      return `<div class="deadline-row ${done ? 'is-complete' : ''}">
        <label class="deadline-check"><input type="checkbox" data-action="toggle-check" data-id="${escapeHtml(task.id)}" ${done ? 'checked' : ''} aria-label="${done ? 'Mark incomplete' : 'Complete'}: ${escapeHtml(task.title)}" /></label>
        <button type="button" class="deadline-task" data-row-id="${escapeHtml(task.id)}">
          <span class="deadline-title">${escapeHtml(task.title)}</span>
          <span class="deadline-course">${escapeHtml(task.course || 'Personal task')}</span>
          <span class="deadline-due ${label === 'Overdue' ? 'is-overdue' : ''}">${escapeHtml(dueLabel)}</span>
          <span class="deadline-source">${escapeHtml(source.label)}</span>
        </button>
      </div>`;
    }).join('');
    const heading = `<span>${label}</span><span class="deadline-count">${list.length}</span>`;
    return label === 'Completed'
      ? `<details class="deadline-completed"><summary>${heading}</summary>${rows}</details>`
      : `<section class="deadline-group" aria-label="${label}"><h2 class="deadline-group-title ${label === 'Overdue' ? 'is-overdue' : ''}">${heading}</h2>${rows}</section>`;
  }).join('');
}

function renderTasksSection() {
  const container = document.getElementById('tasks-container');
  const totalChip = document.getElementById('task-total-chip');
  if (!container) return;

  const completedOpen = container.querySelector('.deadline-completed')?.open || false;
  const filtered = sortTasks(getVisibleTasks());
  if (totalChip) {
    totalChip.textContent = `${filtered.length} ${
      filtered.length === 1 ? 'assignment' : 'assignments'
    }`;
  }

  if (state.subView === 'deadline') {
    container.innerHTML = buildDeadlineHtml(filtered);
  } else if (state.subView === 'table') {
    container.innerHTML = buildTableHtml(filtered);
  } else if (state.subView === 'priority') {
    const levels = ['urgent', 'high', 'medium', 'low'];
    container.innerHTML = `
      <div class="group-stack">
        ${levels
          .map((lvl) => {
            const groupTasks = filtered.filter((t) => t.priority === lvl);
            const meta = PRIORITY_META[lvl];
            return `
              <section class="group-section">
                <div class="group-header">
                  <h3 class="group-title">${meta.label} Priority</h3>
                  <span class="count-meta">${groupTasks.length} ${
              groupTasks.length === 1 ? 'task' : 'tasks'
            }</span>
                </div>
                ${
                  groupTasks.length > 0
                    ? buildTableHtml(groupTasks)
                    : `<div style="padding:20px 0;font-size:13.5px;color:var(--text-muted);border-bottom:1px solid var(--border-color);">No assignments in ${meta.label} priority.</div>`
                }
              </section>
            `;
          })
          .join('')}
      </div>
    `;
  } else if (state.subView === 'platform') {
    const sources = [
      'moodle',
      'google_calendar',
      'google_classroom',
      'notion',
      'trello',
      'personal'
    ];
    container.innerHTML = `
      <div class="group-stack">
        ${sources
          .map((srcKey) => {
            const groupTasks = filtered.filter((t) => t.source === srcKey);
            const meta = SOURCE_META[srcKey];
            return `
              <section class="group-section">
                <div class="group-header">
                  <h3 class="group-title">${meta.label}</h3>
                  <span class="count-meta">${groupTasks.length} ${
              groupTasks.length === 1 ? 'task' : 'tasks'
            }</span>
                </div>
                ${
                  groupTasks.length > 0
                    ? buildTableHtml(groupTasks)
                    : `<div style="padding:20px 0;font-size:13.5px;color:var(--text-muted);border-bottom:1px solid var(--border-color);">No assignments synced from ${meta.label}.</div>`
                }
              </section>
            `;
          })
          .join('')}
      </div>
    `;
  } else if (state.subView === 'board') {
    const columns = [
      { key: 'todo', label: 'To Do' },
      { key: 'in_progress', label: 'In Progress' },
      { key: 'completed', label: 'Completed' }
    ];
    container.innerHTML = `
      <div class="kanban-grid">
        ${columns
          .map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.key);
            return `
              <div class="kanban-col">
                <div class="kanban-col-hdr">
                  <h3 class="group-title">${col.label}</h3>
                  <span class="count-meta">${colTasks.length}</span>
                </div>
                ${colTasks
                  .map((task) => {
                    const prio = PRIORITY_META[task.priority] || PRIORITY_META.medium;
                    const src = SOURCE_META[task.source] || SOURCE_META.personal;
                    const due = formatDueDate(task.dueDate);
                    return `
                      <div class="kanban-card" data-row-id="${escapeHtml(task.id)}">
                        <div class="kanban-card-top">
                          <span class="badge ${prio.badgeClass}">${prio.label}</span>
                          <span class="count-meta">${escapeHtml(task.course || src.label)}</span>
                        </div>
                        <div class="kanban-card-title">${escapeHtml(task.title)}</div>
                        <div class="kanban-card-foot">
                          <span class="mono">${escapeHtml(due.text)}</span>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  const completed = container.querySelector('.deadline-completed');
  if (completed) completed.open = completedOpen;
  attachTaskTableListeners(container);
  container.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
    state.priorityFilter = state.sourceFilter = state.courseFilter = state.statusFilter = 'all';
    state.searchQuery = '';
    document.getElementById('search-input').value = '';
    document.getElementById('filter-source').value = 'all';
    document.getElementById('filter-status').value = 'all';
    renderAll();
  });
  container.querySelector('[data-add-first]')?.addEventListener('click', openNewTaskModal);
}

function attachTaskTableListeners(container) {
  container.querySelectorAll('[data-action="toggle-check"]').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = cell.getAttribute('data-id');
      toggleTaskCompleted(id);
    });
  });

  container.querySelectorAll('[data-action="cycle-priority"]').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = cell.getAttribute('data-id');
      cycleTaskPriority(id);
    });
  });

  container.querySelectorAll('[data-action="cycle-status"]').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = cell.getAttribute('data-id');
      cycleTaskStatus(id);
    });
  });

  container.querySelectorAll('[data-row-id]').forEach((row) => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-row-id');
      openTaskModal(id);
    });
  });
}

// ============================================================================
// CALENDAR RENDERING
// ============================================================================
function renderCalendarSection() {
  const grid = document.getElementById('calendar-grid');
  const titleEl = document.getElementById('cal-title');
  if (!grid || !titleEl) return;

  const year = state.calCursor.getFullYear();
  const month = state.calCursor.getMonth();

  titleEl.textContent = state.calCursor.toLocaleDateString([], {
    month: 'long',
    year: 'numeric'
  });

  const cells = [];
  if (state.calMode === 'month') {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, prevMonthDays - i), outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), outside: false });
    }
    while (cells.length % 7 !== 0) {
      const nextDay = cells.length - (firstDay + daysInMonth) + 1;
      cells.push({ date: new Date(year, month + 1, nextDay), outside: true });
    }
  } else {
    const startOfWeek = new Date(state.calCursor);
    startOfWeek.setDate(state.calCursor.getDate() - state.calCursor.getDay());
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      cells.push({ date: d, outside: false });
    }
  }

  const now = new Date();
  const visibleTasks = getVisibleTasks();

  grid.innerHTML = cells
    .map(({ date, outside }) => {
      const isToday =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

      const dateIsoPrefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(date.getDate()).padStart(2, '0')}`;

      const dayTasks = visibleTasks.filter((t) => {
        const td = new Date(t.dueDate);
        return (
          td.getFullYear() === date.getFullYear() &&
          td.getMonth() === date.getMonth() &&
          td.getDate() === date.getDate()
        );
      });

      return `
        <div class="cal-cell ${outside ? 'outside' : ''}" data-cal-date="${dateIsoPrefix}">
          <div class="cal-cell-top">
            <span class="cal-day-num ${isToday ? 'today' : ''}">${date.getDate()}</span>
            <button type="button" class="cal-add-btn" data-add-date="${dateIsoPrefix}" title="Add assignment on ${dateIsoPrefix}">+</button>
          </div>
          ${dayTasks
            .map((task) => {
              const src = SOURCE_META[task.source] || SOURCE_META.personal;
              const prio = PRIORITY_META[task.priority] || PRIORITY_META.medium;
              return `
                <div class="cal-event-chip ${src.badgeClass}" data-event-id="${escapeHtml(
                  task.id
                )}" title="${escapeHtml(task.title)} (${prio.label})">
                  <span style="overflow:hidden;text-overflow:ellipsis;">${escapeHtml(
                    task.title
                  )}</span>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    })
    .join('');

  grid.querySelectorAll('[data-event-id]').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      openTaskModal(chip.getAttribute('data-event-id'));
    });
  });

  grid.querySelectorAll('[data-add-date]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openNewTaskModal(btn.getAttribute('data-add-date'));
    });
  });
}

// ============================================================================
// TASK MUTATIONS + SERVER/LOCAL/FIREBSAE PERSISTENCE
// ============================================================================
async function persistTask(task) {
  saveLocalState();
  renderAll();
  if (state.user) {
    await saveTaskToFirestore(state.user.uid, task);
  }
}

function toggleTaskCompleted(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;
  task.status = task.status === 'completed' ? 'todo' : 'completed';
  persistTask(task);
}

function cycleTaskPriority(taskId) {
  const order = ['low', 'medium', 'high', 'urgent'];
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;
  const idx = order.indexOf(task.priority);
  task.priority = order[(idx + 1) % order.length];
  persistTask(task);
}

function cycleTaskStatus(taskId) {
  const order = ['todo', 'in_progress', 'completed'];
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;
  const idx = order.indexOf(task.status);
  task.status = order[(idx + 1) % order.length];
  persistTask(task);
}

// ============================================================================
// EXPLICIT USER CONFIRMATION DIALOG FOR GOOGLE WORKSPACE MUTATIONS
// ============================================================================
function openGcalConfirmation({ title, description, items, confirmLabel, onConfirm }) {
  document.getElementById('confirm-gcal-title').textContent = title;
  document.getElementById('confirm-gcal-desc').textContent = description;

  const itemsContainer = document.getElementById('confirm-gcal-items');
  itemsContainer.innerHTML = items
    .map(
      (item) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="font-weight:500;">${escapeHtml(item.title)}</span>
        <span class="mono" style="font-size:11.5px;color:var(--text-secondary);white-space:nowrap;">${escapeHtml(
          item.meta || ''
        )}</span>
      </div>
    `
    )
    .join('');

  const confirmBtn = document.getElementById('btn-proceed-confirm-gcal');
  confirmBtn.textContent = confirmLabel || 'Confirm Action';
  state.pendingConfirmCallback = onConfirm;

  document.getElementById('modal-confirm-gcal').classList.remove('hidden');
}

function closeGcalConfirmation() {
  state.pendingConfirmCallback = null;
  document.getElementById('modal-confirm-gcal').classList.add('hidden');
}

// ============================================================================
// GOOGLE CALENDAR SYNC HUB LOGIC
// ============================================================================
function showFeedbackBox(elementId, msg, isError = false) {
  const box = document.getElementById(elementId);
  if (!box) return;
  box.classList.remove('hidden');
  box.style.backgroundColor = isError ? 'var(--rose-bg)' : 'var(--sage-bg)';
  box.style.borderColor = isError ? 'var(--rose-border)' : 'var(--sage-border)';
  box.style.color = isError ? 'var(--rose-text)' : 'var(--sage-text)';
  box.textContent = msg;
}

function showGcalFeedback(msg, isError = false) {
  showFeedbackBox('gcal-feedback-box', msg, isError);
}

async function ensureGoogleCalendarToken() {
  const token = await getAccessToken();
  if (token) {
    state.hasGcalToken = true;
    return token;
  }
  const manualInput = document.getElementById('gcal-manual-token')?.value?.trim();
  if (manualInput) {
    setInMemoryAccessToken(manualInput);
    state.hasGcalToken = true;
    renderAll();
    return manualInput;
  }
  if (!GOOGLE_LOGIN_ENABLED) {
    throw new Error(
      'Google Sign-In is disabled for now. Use "Sync iCal Feed" / "Download .ics" above, or paste a Google Calendar OAuth token in the token field.'
    );
  }
  const res = await googleSignIn();
  if (res?.accessToken) {
    state.user = res.user;
    state.hasGcalToken = true;
    renderAll();
    return res.accessToken;
  }
  throw new Error('Google Calendar authorization was cancelled.');
}

function renderGcalModalContent() {
  const titleEl = document.getElementById('gcal-auth-status-title');
  const descEl = document.getElementById('gcal-auth-status-desc');
  const btnTextEl = document.getElementById('gcal-signin-btn-text');
  const listEl = document.getElementById('gcal-synced-list');
  const exportUrlInput = document.getElementById('gcal-export-ics-url');
  const icalUrlInput = document.getElementById('gcal-ical-url');

  if (exportUrlInput) {
    exportUrlInput.value = `${window.location.origin}/api/calendar.ics`;
  }
  if (icalUrlInput && !icalUrlInput.value && state.settings.gcalIcalUrl) {
    icalUrlInput.value = state.settings.gcalIcalUrl;
  }

  if (!titleEl || !descEl || !btnTextEl || !listEl) return;

  if (!GOOGLE_LOGIN_ENABLED) {
    titleEl.textContent = state.hasGcalToken
      ? 'Google Calendar API Token Active'
      : 'Google Sign-In Disabled for Now';
    descEl.textContent = state.hasGcalToken
      ? 'In-memory OAuth token loaded — ready for two-way API sync'
      : 'Use iCal (.ics) URL sync & phone calendar subscription below, or paste an API token';
    btnTextEl.textContent = 'Google Login (Unavailable)';
  } else if (state.user && state.hasGcalToken) {
    titleEl.textContent = 'Google Calendar Connected';
    descEl.textContent = `Authorized as ${state.user.email} — ready for two-way event sync`;
    btnTextEl.textContent = 'Reconnect Google';
  } else {
    titleEl.textContent = 'Connect Google Calendar';
    descEl.textContent = 'Sign in with Google to authorize Calendar event sync';
    btnTextEl.textContent = 'Sign in with Google';
  }

  const syncedTasks = state.tasks.filter(
    (t) => t.source === 'google_calendar' || Boolean(t.gcalEventId)
  );

  if (syncedTasks.length === 0) {
    listEl.innerHTML = `
      <div style="padding:16px 0;color:var(--text-muted);font-size:13px;">
        No Google Calendar events synced yet. Paste your Google Calendar iCal (.ics) URL above or use API import/export.
      </div>
    `;
    return;
  }

  listEl.innerHTML = syncedTasks
    .map((task) => {
      const due = formatDueDate(task.dueDate);
      return `
        <div class="course-item">
          <div style="min-width:0;">
            <div style="font-weight:500;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(
              task.title
            )}</div>
            <div class="mono" style="font-size:11.5px;color:var(--text-secondary);">Due ${escapeHtml(
              due.text
            )}</div>
          </div>
          ${
            task.gcalEventId
              ? `<button type="button" class="hdr-btn" data-remove-gcal-id="${escapeHtml(
                  task.id
                )}" style="height:28px;padding:0 10px;font-size:11.5px;color:var(--rose-text);border-color:var(--rose-border);background:var(--rose-bg);">Remove</button>`
              : ''
          }
        </div>
      `;
    })
    .join('');

  listEl.querySelectorAll('[data-remove-gcal-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const taskId = btn.getAttribute('data-remove-gcal-id');
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) return;

      const due = formatDueDate(task.dueDate);
      openGcalConfirmation({
        title: 'Remove Google Calendar Event?',
        description:
          'Remove this synced event from Calen (and from Google Calendar if an API token is active)?',
        items: [{ title: task.title, meta: due.text }],
        confirmLabel: 'Remove Event',
        onConfirm: async () => {
          try {
            const token = await getAccessToken();
            if (token && task.gcalEventId) {
              await deleteGoogleCalendarEvent(task.gcalEventId);
            }
            if (task.source === 'google_calendar') {
              state.tasks = state.tasks.filter((t) => t.id !== task.id);
              if (state.user) await deleteTaskFromFirestore(state.user.uid, task.id);
            } else {
              delete task.gcalEventId;
              if (state.user) await saveTaskToFirestore(state.user.uid, task);
            }
            saveLocalState();
            renderAll();
            showGcalFeedback(`Removed "${task.title}".`);
          } catch (err) {
            showGcalFeedback(err.message || 'Failed to remove Google Calendar event.', true);
          }
        }
      });
    });
  });
}

function openGcalModal() {
  const box = document.getElementById('gcal-feedback-box');
  if (box) box.classList.add('hidden');
  renderGcalModalContent();
  document.getElementById('modal-gcal').classList.remove('hidden');
}

async function handleGcalIcalUrlSync() {
  const urlInput = document.getElementById('gcal-ical-url');
  const url = urlInput?.value?.trim();
  if (!url) {
    showGcalFeedback('Please paste your Google Calendar Secret address in iCal (.ics) format.', true);
    return;
  }
  try {
    showGcalFeedback('Fetching Google Calendar iCal (.ics) feed via local server...');
    const res = await fetch('/api/proxy/ical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to fetch Google Calendar iCal URL.');
    }
    const events = parseIcsEvents(data.ics, 'google_calendar', 'Google Calendar');
    const { added, updated } = mergeImportedTasks(events);
    state.settings.gcalIcalUrl = url;
    saveLocalState();
    renderAll();
    showGcalFeedback(
      `Synced ${events.length} Google Calendar event(s) (${added} new, ${updated} updated).`
    );
  } catch (err) {
    showGcalFeedback(err.message || 'Could not sync Google Calendar iCal feed.', true);
  }
}

function downloadClientIcsFile() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calen//Unified Academic Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Calen Deadlines',
    'X-WR-TIMEZONE:Asia/Manila'
  ];
  for (const task of state.tasks) {
    if (!task.dueDate) continue;
    const endDt = new Date(task.dueDate);
    if (Number.isNaN(endDt.getTime())) continue;
    const startDt = new Date(endDt.getTime() - 60 * 60 * 1000);
    const dtStart = startDt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const dtEnd = endDt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = `${task.status === 'completed' ? '[Done] ' : ''}${
      task.course ? `[${task.course}] ` : ''
    }${task.title}`.replace(/[,;\\]/g, ' ');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${task.id}@calen.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${title}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'calen-deadlines.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  showGcalFeedback('Downloaded calen-deadlines.ics! Import it into Google Calendar or your phone calendar.');
}

async function handleGcalImport() {
  try {
    showGcalFeedback('Connecting to Google Calendar API...');
    await ensureGoogleCalendarToken();
    const events = await fetchGoogleCalendarEvents(30);

    let importedCount = 0;
    for (const ev of events) {
      if (!ev.id || ev.status === 'cancelled') continue;
      const rawStart = ev.end?.dateTime || ev.start?.dateTime || ev.start?.date;
      if (!rawStart) continue;
      const dueIso = new Date(rawStart).toISOString();
      const cleanSummary = (ev.summary || 'Untitled Calendar Event').replace(/^\[Calen\]\s*/i, '');

      const existing = state.tasks.find(
        (t) => t.gcalEventId === ev.id || t.id === `gcal-${ev.id}`
      );
      if (existing) {
        existing.title = cleanSummary;
        existing.dueDate = dueIso;
        existing.gcalEventId = ev.id;
        if (state.user) await saveTaskToFirestore(state.user.uid, existing);
      } else {
        const newTask = {
          id: `gcal-${ev.id.slice(0, 32)}`,
          title: cleanSummary,
          priority: 'medium',
          status: 'todo',
          source: 'google_calendar',
          course: 'Google Calendar',
          dueDate: dueIso,
          description: ev.description || 'Imported from primary Google Calendar.',
          gcalEventId: ev.id,
          subtasks: []
        };
        state.tasks.unshift(newTask);
        importedCount++;
        if (state.user) await saveTaskToFirestore(state.user.uid, newTask);
      }
    }

    saveLocalState();
    renderAll();
    showGcalFeedback(
      `Successfully synced ${events.length} event(s) from Google Calendar (${importedCount} new added).`
    );
  } catch (err) {
    showGcalFeedback(err.message || 'Could not import Google Calendar events.', true);
  }
}

function handleGcalBulkExportPrompt() {
  const pendingTasks = state.tasks.filter((t) => t.status !== 'completed');
  if (pendingTasks.length === 0) {
    showGcalFeedback('All tasks are already completed — no pending deadlines to push.', true);
    return;
  }

  openGcalConfirmation({
    title: `Push ${pendingTasks.length} Deadline(s) to Google Calendar?`,
    description: `This will create or update ${pendingTasks.length} event(s) on your primary Google Calendar. Please confirm to proceed:`,
    items: pendingTasks.map((t) => ({
      title: t.title,
      meta: formatDueDate(t.dueDate).text
    })),
    confirmLabel: `Push ${pendingTasks.length} Event(s)`,
    onConfirm: async () => {
      try {
        showGcalFeedback('Pushing deadlines to Google Calendar...');
        await ensureGoogleCalendarToken();
        let pushed = 0;
        for (const task of pendingTasks) {
          const created = await upsertGoogleCalendarEvent(task);
          if (created?.id) {
            task.gcalEventId = created.id;
            pushed++;
            if (state.user) await saveTaskToFirestore(state.user.uid, task);
          }
        }
        saveLocalState();
        renderAll();
        showGcalFeedback(`Successfully synced ${pushed} deadline(s) to your Google Calendar!`);
      } catch (err) {
        showGcalFeedback(err.message || 'Failed to push deadlines to Google Calendar.', true);
      }
    }
  });
}

// ============================================================================
// OTHER MODALS LOGIC (TASK, MOODLE, CLASSROOM, SETTINGS)
// ============================================================================
function openNewTaskModal(prefillDateStr = null) {
  state.editingTaskId = null;
  state.draftSubtasks = [];

  document.getElementById('modal-task-heading').textContent = 'Create New Assignment';
  document.getElementById('task-id').value = '';
  document.getElementById('task-title').value = '';
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-status').value = 'todo';
  document.getElementById('task-source').value = 'personal';
  document.getElementById('task-course').value = '';
  document.getElementById('task-desc').value = '';

  const d = prefillDateStr ? new Date(`${prefillDateStr}T23:59:00`) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  document.getElementById('task-date').value = prefillDateStr || `${yyyy}-${mm}-${dd}`;
  document.getElementById('task-time').value = '23:59';

  document.getElementById('btn-delete-task').classList.add('hidden');
  document.getElementById('btn-push-single-gcal').classList.add('hidden');
  renderDraftSubtasks();
  document.getElementById('modal-task').classList.remove('hidden');
}

function openTaskModal(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return;

  state.editingTaskId = task.id;
  state.draftSubtasks = structuredClone(task.subtasks || []);

  document.getElementById('modal-task-heading').textContent = 'Edit Assignment';
  document.getElementById('task-id').value = task.id;
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-status').value = task.status;
  document.getElementById('task-source').value = task.source;
  document.getElementById('task-course').value = task.course || '';
  document.getElementById('task-desc').value = task.description || '';

  const dt = new Date(task.dueDate);
  if (!Number.isNaN(dt.getTime())) {
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    document.getElementById('task-date').value = `${yyyy}-${mm}-${dd}`;
    document.getElementById('task-time').value = `${hh}:${min}`;
  }

  document.getElementById('btn-delete-task').classList.remove('hidden');
  const pushBtn = document.getElementById('btn-push-single-gcal');
  pushBtn.classList.remove('hidden');
  pushBtn.textContent = task.gcalEventId
    ? 'Update on Google Calendar'
    : 'Sync to Google Calendar';

  renderDraftSubtasks();
  document.getElementById('modal-task').classList.remove('hidden');
}

function renderDraftSubtasks() {
  const listEl = document.getElementById('task-subtasks-list');
  if (!listEl) return;

  listEl.innerHTML = state.draftSubtasks
    .map(
      (sub, idx) => `
      <div class="course-item" style="padding:8px 0;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;">
          <input type="checkbox" data-sub-idx="${idx}" ${sub.completed ? 'checked' : ''} />
          <span style="${
            sub.completed ? 'text-decoration:line-through;color:var(--text-muted);' : ''
          }">${escapeHtml(sub.title)}</span>
        </label>
        <button type="button" data-remove-sub="${idx}" style="color:var(--text-muted);font-size:12px;">✕</button>
      </div>
    `
    )
    .join('');

  listEl.querySelectorAll('[data-sub-idx]').forEach((chk) => {
    chk.addEventListener('change', () => {
      const i = Number(chk.getAttribute('data-sub-idx'));
      state.draftSubtasks[i].completed = chk.checked;
      renderDraftSubtasks();
    });
  });

  listEl.querySelectorAll('[data-remove-sub]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-remove-sub'));
      state.draftSubtasks.splice(i, 1);
      renderDraftSubtasks();
    });
  });
}

// ============================================================================
// MOODLE LMS MODAL & SYNC
// ============================================================================
function renderMoodleCoursesList() {
  const listEl = document.getElementById('moodle-courses-list');
  if (!listEl) return;

  listEl.innerHTML = state.moodleCourses
    .map(
      (course) => `
      <label class="course-item" data-course-id="${escapeHtml(course.id)}">
        <div style="display:flex;align-items:center;gap:12px;">
          <input type="checkbox" class="moodle-course-chk" value="${escapeHtml(course.id)}" ${
            course.synced ? 'checked' : ''
          } />
          <div>
            <div style="font-weight:600;font-size:13.5px;">${escapeHtml(
              course.code
            )} — ${escapeHtml(course.name)}</div>
            <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(
              course.instructor
            )} · ${course.assignments?.length || 0} module deadlines</div>
          </div>
        </div>
        <span class="badge ${course.synced ? 'badge-peach' : 'badge-stone'}">${
          course.synced ? 'Synced' : 'Available'
        }</span>
      </label>
    `
    )
    .join('');

  listEl.querySelectorAll('.moodle-course-chk').forEach((chk) => {
    chk.addEventListener('change', () => {
      const course = state.moodleCourses.find((c) => c.id === chk.value);
      if (course) {
        course.synced = chk.checked;
        renderMoodleCoursesList();
      }
    });
  });
}

function openMoodleModal() {
  const box = document.getElementById('moodle-feedback-box');
  if (box) box.classList.add('hidden');
  const urlInput = document.getElementById('moodle-url');
  if (urlInput && state.settings.moodleUrl) {
    urlInput.value = state.settings.moodleUrl;
  }
  const icalUrlInput = document.getElementById('moodle-ical-url');
  if (icalUrlInput && state.settings.moodleIcalUrl) {
    icalUrlInput.value = state.settings.moodleIcalUrl;
  }
  renderMoodleCoursesList();
  document.getElementById('modal-moodle').classList.remove('hidden');
}

async function handleFetchMoodleApi() {
  const moodleUrl = document.getElementById('moodle-url')?.value?.trim();
  const token = document.getElementById('moodle-token')?.value?.trim();
  if (!moodleUrl || !token) {
    showFeedbackBox('moodle-feedback-box', 'Enter your Moodle URL and WebService token.', true);
    return;
  }
  if (moodleUrl.includes('moodle.university.edu') || token === 'mdl_ws_98f4a21c7e3b') {
    showFeedbackBox(
      'moodle-feedback-box',
      'Demo Moodle credentials detected — synced the built-in Moodle courses below. Replace with your school Moodle URL & token or paste your Moodle Calendar iCal URL below for live school data!'
    );
    return;
  }

  try {
    showFeedbackBox('moodle-feedback-box', 'Connecting to Moodle REST API via local server...');
    const res = await fetch('/api/proxy/moodle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moodleUrl, token })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to connect to Moodle REST API.');
    }
    if (Array.isArray(data.courses) && data.courses.length > 0) {
      state.moodleCourses = data.courses;
      state.settings.moodleUrl = moodleUrl;
      renderMoodleCoursesList();
      showFeedbackBox(
        'moodle-feedback-box',
        `Connected to ${data.siteName || 'Moodle'}! Loaded ${data.courses.length} enrolled course(s). Click "Sync Selected Courses" to save.`
      );
    } else {
      showFeedbackBox('moodle-feedback-box', 'Connected to Moodle, but no active courses were returned.', true);
    }
  } catch (err) {
    showFeedbackBox('moodle-feedback-box', err.message || 'Moodle API request failed.', true);
  }
}

async function handleFetchMoodleIcalUrl() {
  const url = document.getElementById('moodle-ical-url')?.value?.trim();
  if (!url) {
    showFeedbackBox('moodle-feedback-box', 'Please paste your Moodle Calendar Export (.ics) URL.', true);
    return;
  }
  try {
    showFeedbackBox('moodle-feedback-box', 'Fetching Moodle iCal (.ics) feed via local server...');
    const res = await fetch('/api/proxy/ical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to fetch Moodle iCal feed.');
    }
    const events = parseIcsEvents(data.ics, 'moodle', 'Moodle iCal');
    const { added, updated } = mergeImportedTasks(events);
    state.settings.moodleIcalUrl = url;
    saveLocalState();
    renderAll();
    showFeedbackBox(
      'moodle-feedback-box',
      `Synced ${events.length} Moodle deadline(s) (${added} new, ${updated} updated)!`
    );
  } catch (err) {
    showFeedbackBox('moodle-feedback-box', err.message || 'Failed to sync Moodle iCal URL.', true);
  }
}

async function applyMoodleCourseSync() {
  const syncedCourseIds = new Set(state.moodleCourses.filter((c) => c.synced).map((c) => c.code));

  const nonCourseMoodleTasks = state.tasks.filter(
    (t) =>
      t.source !== 'moodle' || (!t.id.startsWith('mdl-task-') && syncedCourseIds.has(t.course))
  );

  const courseAssignments = state.moodleCourses
    .filter((c) => c.synced)
    .flatMap((c) => c.assignments || []);

  const mergedMap = new Map();
  nonCourseMoodleTasks.forEach((t) => mergedMap.set(t.id, t));
  courseAssignments.forEach((t) => {
    const existing = state.tasks.find((ex) => ex.id === t.id);
    mergedMap.set(t.id, existing || t);
  });

  state.tasks = Array.from(mergedMap.values());
  saveLocalState();
  renderAll();

  if (state.user) {
    await saveMoodleCoursesToFirestore(state.user.uid, state.moodleCourses);
    for (const t of courseAssignments) {
      await saveTaskToFirestore(state.user.uid, t);
    }
  }

  document.getElementById('modal-moodle').classList.add('hidden');
}

// ============================================================================
// GOOGLE CLASSROOM MODAL & SYNC
// ============================================================================
function renderClassroomCoursesList() {
  const listEl = document.getElementById('classroom-courses-list');
  if (!listEl) return;

  listEl.innerHTML = state.classroomCourses
    .map(
      (course) => `
      <label class="course-item" data-classroom-id="${escapeHtml(course.id)}">
        <div style="display:flex;align-items:center;gap:12px;">
          <input type="checkbox" class="classroom-course-chk" value="${escapeHtml(course.id)}" ${
            course.synced ? 'checked' : ''
          } />
          <div>
            <div style="font-weight:600;font-size:13.5px;">${escapeHtml(
              course.code
            )} — ${escapeHtml(course.name)}</div>
            <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(
              course.instructor
            )} · ${course.assignments?.length || 0} coursework items</div>
          </div>
        </div>
        <span class="badge ${course.synced ? 'badge-sage' : 'badge-stone'}">${
          course.synced ? 'Synced' : 'Available'
        }</span>
      </label>
    `
    )
    .join('');

  listEl.querySelectorAll('.classroom-course-chk').forEach((chk) => {
    chk.addEventListener('change', () => {
      const course = state.classroomCourses.find((c) => c.id === chk.value);
      if (course) {
        course.synced = chk.checked;
        renderClassroomCoursesList();
      }
    });
  });
}

function openClassroomModal() {
  const box = document.getElementById('classroom-feedback-box');
  if (box) box.classList.add('hidden');
  const icalInput = document.getElementById('classroom-ical-url');
  if (icalInput && state.settings.classroomIcalUrl) {
    icalInput.value = state.settings.classroomIcalUrl;
  }
  renderClassroomCoursesList();
  document.getElementById('modal-classroom').classList.remove('hidden');
}

async function handleClassroomIcalSync() {
  const url = document.getElementById('classroom-ical-url')?.value?.trim();
  if (!url) {
    showFeedbackBox(
      'classroom-feedback-box',
      'Paste your Google Classroom Calendar iCal (.ics) URL (from Google Calendar -> Settings for class calendar -> Secret address in iCal format).',
      true
    );
    return;
  }
  try {
    showFeedbackBox('classroom-feedback-box', 'Fetching Google Classroom iCal feed...');
    const res = await fetch('/api/proxy/ical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to fetch Classroom iCal feed.');
    }
    const events = parseIcsEvents(data.ics, 'google_classroom', 'Google Classroom');
    const { added, updated } = mergeImportedTasks(events);
    state.settings.classroomIcalUrl = url;
    saveLocalState();
    renderAll();
    showFeedbackBox(
      'classroom-feedback-box',
      `Synced ${events.length} Google Classroom assignment(s) (${added} new, ${updated} updated)!`
    );
  } catch (err) {
    showFeedbackBox('classroom-feedback-box', err.message || 'Classroom iCal sync failed.', true);
  }
}

async function handleFetchClassroomApi() {
  const accessToken = document.getElementById('classroom-api-token')?.value?.trim();
  if (!accessToken) {
    showFeedbackBox(
      'classroom-feedback-box',
      'Paste a Google OAuth Bearer token with Classroom read scopes.',
      true
    );
    return;
  }
  try {
    showFeedbackBox('classroom-feedback-box', 'Fetching courses & coursework from Google Classroom API...');
    const res = await fetch('/api/proxy/classroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to fetch Google Classroom courses.');
    }
    if (Array.isArray(data.courses) && data.courses.length > 0) {
      state.classroomCourses = data.courses;
      renderClassroomCoursesList();
      showFeedbackBox(
        'classroom-feedback-box',
        `Loaded ${data.courses.length} active Google Classroom course(s)! Click "Sync Selected Classes" to save.`
      );
    } else {
      showFeedbackBox('classroom-feedback-box', 'No active Google Classroom courses found for this account.', true);
    }
  } catch (err) {
    showFeedbackBox('classroom-feedback-box', err.message || 'Classroom API request failed.', true);
  }
}

function applyClassroomCourseSync() {
  const syncedCodes = new Set(state.classroomCourses.filter((c) => c.synced).map((c) => c.code));

  const nonCourseClassroomTasks = state.tasks.filter(
    (t) =>
      t.source !== 'google_classroom' ||
      (!t.id.startsWith('task-gc-') && !t.id.startsWith('gc-work-') && syncedCodes.has(t.course))
  );

  const courseAssignments = state.classroomCourses
    .filter((c) => c.synced)
    .flatMap((c) => c.assignments || []);

  const mergedMap = new Map();
  nonCourseClassroomTasks.forEach((t) => mergedMap.set(t.id, t));
  courseAssignments.forEach((t) => {
    const existing = state.tasks.find((ex) => ex.id === t.id);
    mergedMap.set(t.id, existing || t);
  });

  state.tasks = Array.from(mergedMap.values());
  saveLocalState();
  renderAll();
  document.getElementById('modal-classroom').classList.add('hidden');
}

function openSettingsModal() {
  renderSettingsSyncStatus();

  const gcalToggle = document.getElementById('toggle-plat-gcal');
  if (gcalToggle) {
    gcalToggle.checked = state.settings.platforms.google_calendar !== false;
  }

  const moodleToggle = document.getElementById('toggle-plat-moodle');
  if (moodleToggle) {
    moodleToggle.checked = state.settings.platforms.moodle !== false;
  }

  const classroomToggle = document.getElementById('toggle-plat-classroom');
  if (classroomToggle) {
    classroomToggle.checked = state.settings.platforms.google_classroom !== false;
  }

  const listEl = document.getElementById('settings-integrations-list');
  if (listEl) {
    const platforms = [
      {
        key: 'notion',
        name: 'Notion Workspace',
        desc: 'Sync study databases and reading lists'
      },
      {
        key: 'trello',
        name: 'Trello Boards',
        desc: 'Sync project sprints and group milestones'
      }
    ];

    listEl.innerHTML = platforms
      .map(
        (p) => `
        <label class="course-item">
          <div>
            <div style="font-size:13.5px;font-weight:600;">${p.name}</div>
            <div style="font-size:12px;color:var(--text-secondary);">${p.desc}</div>
          </div>
          <input type="checkbox" data-platform-toggle="${p.key}" ${
            state.settings.platforms[p.key] !== false ? 'checked' : ''
          } />
        </label>
      `
      )
      .join('');

    listEl.querySelectorAll('[data-platform-toggle]').forEach((chk) => {
      chk.addEventListener('change', async () => {
        const key = chk.getAttribute('data-platform-toggle');
        state.settings.platforms[key] = chk.checked;
        saveLocalState();
        renderAll();
        if (state.user) {
          await saveSettingsToFirestore(state.user.uid, state.settings);
        }
      });
    });
  }

  const shareInput = document.getElementById('sync-share-url');
  if (shareInput) {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ tasks: state.tasks }))));
    shareInput.value = `${window.location.origin}${window.location.pathname}#sync=${payload}`;
  }

  applyTheme();
  document.getElementById('modal-settings').classList.remove('hidden');
}

// ============================================================================
// EVENT LISTENERS & INITIALIZATION
// ============================================================================
function initEvents() {
  // Keep keyboard focus inside the active dialog and restore its trigger on close.
  const dialogStack = [];
  document.querySelectorAll('.modal-overlay').forEach((dialog) => {
    let wasOpen = !dialog.classList.contains('hidden');
    let trigger = null;
    new MutationObserver(() => {
      const open = !dialog.classList.contains('hidden');
      if (open === wasOpen) return;
      wasOpen = open;
      if (open) {
        trigger = document.activeElement;
        dialogStack.push(dialog);
        dialog.querySelector('button:not([disabled]), input:not([type="hidden"]), select, textarea')?.focus();
      } else {
        const index = dialogStack.indexOf(dialog);
        if (index !== -1) dialogStack.splice(index, 1);
        if (trigger?.isConnected) trigger.focus();
      }
    }).observe(dialog, { attributes: true, attributeFilter: ['class'] });
  });
  document.addEventListener('keydown', (event) => {
    const dialog = dialogStack.at(-1);
    if (!dialog) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.querySelector('[id^="close-"]')?.click();
    }
    if (event.key === 'Tab') {
      const controls = [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
        .filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => selectView(button.dataset.view));
  });
  document.querySelectorAll('[data-open-settings]').forEach((button) => {
    button.addEventListener('click', () => {
      openSettingsModal();
      if (button.dataset.openSettings === 'connections') {
        document.getElementById('btn-gcal-modal').scrollIntoView({ block: 'center' });
      }
    });
  });
  document.querySelectorAll('[data-source]').forEach((button) => {
    button.addEventListener('click', () => {
      state.sourceFilter = button.dataset.source;
      document.getElementById('filter-source').value = state.sourceFilter;
      selectView('tasks');
      renderAll();
    });
  });
  document.getElementById('toggle-sidebar').addEventListener('click', (event) => {
    const collapsed = document.body.classList.toggle('sidebar-collapsed');
    event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
    event.currentTarget.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  });
  document.getElementById('filter-course').addEventListener('change', (event) => {
    state.courseFilter = event.target.value;
    renderTasksSection();
  });

  document.querySelectorAll('.subview-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.subView = btn.getAttribute('data-subview');
      document.querySelectorAll('.subview-btn').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      renderTasksSection();
    });
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderTasksSection();
  });

  document.getElementById('filter-source').addEventListener('change', (e) => {
    state.sourceFilter = e.target.value;
    renderAll();
  });

  document.getElementById('filter-status').addEventListener('change', (e) => {
    state.statusFilter = e.target.value;
    renderAll();
  });

  document.getElementById('sort-by').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderTasksSection();
  });

  document.getElementById('quick-add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('quick-add-title');
    const title = titleInput.value.trim();
    if (!title) return;

    const newTask = {
      id: `task-${Date.now()}`,
      title,
      priority: document.getElementById('quick-add-priority').value,
      status: 'todo',
      source: document.getElementById('quick-add-source').value,
      course: '',
      dueDate: offsetDateISO(1, 23, 59),
      description: '',
      subtasks: []
    };

    state.tasks.unshift(newTask);
    titleInput.value = '';
    await persistTask(newTask);
  });

  // Top Header & Unified Settings Modal Triggers
  document.getElementById('btn-new-task').addEventListener('click', () => openNewTaskModal());
  document.getElementById('btn-settings-modal').addEventListener('click', openSettingsModal);
  document.getElementById('btn-gcal-modal').addEventListener('click', openGcalModal);
  document.getElementById('btn-moodle-modal').addEventListener('click', openMoodleModal);
  document.getElementById('btn-classroom-modal').addEventListener('click', openClassroomModal);

  document.getElementById('toggle-plat-gcal').addEventListener('change', async (e) => {
    state.settings.platforms.google_calendar = e.target.checked;
    saveLocalState();
    renderAll();
    if (state.user) {
      await saveSettingsToFirestore(state.user.uid, state.settings);
    }
  });

  document.getElementById('toggle-plat-moodle').addEventListener('change', async (e) => {
    state.settings.platforms.moodle = e.target.checked;
    saveLocalState();
    renderAll();
    if (state.user) {
      await saveSettingsToFirestore(state.user.uid, state.settings);
    }
  });

  document.getElementById('toggle-plat-classroom').addEventListener('change', async (e) => {
    state.settings.platforms.google_classroom = e.target.checked;
    saveLocalState();
    renderAll();
    if (state.user) {
      await saveSettingsToFirestore(state.user.uid, state.settings);
    }
  });

  document.getElementById('btn-theme-quick').addEventListener('click', async () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    state.settings.theme = isCurrentlyDark ? 'light' : 'dark';
    saveLocalState();
    applyTheme();
    if (state.user) {
      await saveSettingsToFirestore(state.user.uid, state.settings);
    }
  });

  const handleCloudAuthClick = async () => {
    if (!GOOGLE_LOGIN_ENABLED) return;
    try {
      if (state.user) {
        await logoutUser();
        state.hasGcalToken = false;
        renderAll();
      } else {
        const res = await googleSignIn();
        if (res?.accessToken) {
          state.hasGcalToken = true;
          renderAll();
        }
      }
    } catch (err) {
      console.error('Authentication action failed:', err);
    }
  };
  document.getElementById('btn-modal-cloud-login').addEventListener('click', handleCloudAuthClick);

  document.getElementById('close-gcal-modal').addEventListener('click', () => {
    document.getElementById('modal-gcal').classList.add('hidden');
  });
  document.getElementById('done-gcal-modal').addEventListener('click', () => {
    document.getElementById('modal-gcal').classList.add('hidden');
  });
  document.getElementById('btn-gcal-google-signin').addEventListener('click', async () => {
    if (!GOOGLE_LOGIN_ENABLED) return;
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        state.user = res.user;
        state.hasGcalToken = true;
        renderAll();
        showGcalFeedback('Connected to Google Calendar! You can now import or push events.');
      }
    } catch (err) {
      showGcalFeedback(err.message || 'Google Sign-In failed.', true);
    }
  });
  document.getElementById('btn-gcal-ical-sync').addEventListener('click', handleGcalIcalUrlSync);
  document.getElementById('btn-copy-ics-url').addEventListener('click', () => {
    const input = document.getElementById('gcal-export-ics-url');
    navigator.clipboard?.writeText(input.value);
    showGcalFeedback('Copied live iCal (.ics) feed URL! Add it in Google Calendar -> "From URL".');
  });
  document.getElementById('btn-download-ics').addEventListener('click', downloadClientIcsFile);
  document.getElementById('btn-gcal-save-token').addEventListener('click', () => {
    const token = document.getElementById('gcal-manual-token')?.value?.trim();
    if (!token) {
      setInMemoryAccessToken(null);
      state.hasGcalToken = false;
      renderAll();
      showGcalFeedback('Cleared in-memory Google Calendar API token.');
      return;
    }
    setInMemoryAccessToken(token);
    state.hasGcalToken = true;
    renderAll();
    showGcalFeedback('In-memory Google Calendar API token set! You can now use Import/Push via API.');
  });
  document.getElementById('btn-gcal-import').addEventListener('click', handleGcalImport);
  document.getElementById('btn-gcal-export').addEventListener('click', handleGcalBulkExportPrompt);

  document.getElementById('close-confirm-gcal').addEventListener('click', closeGcalConfirmation);
  document
    .getElementById('btn-cancel-confirm-gcal')
    .addEventListener('click', closeGcalConfirmation);
  document.getElementById('btn-proceed-confirm-gcal').addEventListener('click', async () => {
    const cb = state.pendingConfirmCallback;
    closeGcalConfirmation();
    if (cb) await cb();
  });

  document.getElementById('btn-push-single-gcal').addEventListener('click', () => {
    if (!state.editingTaskId) return;
    const task = state.tasks.find((t) => t.id === state.editingTaskId);
    if (!task) return;

    const actionVerb = task.gcalEventId ? 'Update' : 'Create';
    openGcalConfirmation({
      title: `${actionVerb} Event on Google Calendar?`,
      description: `Are you sure you want to ${actionVerb.toLowerCase()} "${task.title}" on your primary Google Calendar?`,
      items: [{ title: task.title, meta: formatDueDate(task.dueDate).text }],
      confirmLabel: `${actionVerb} on Google Calendar`,
      onConfirm: async () => {
        try {
          await ensureGoogleCalendarToken();
          const result = await upsertGoogleCalendarEvent(task);
          if (result?.id) {
            task.gcalEventId = result.id;
            await persistTask(task);
          }
          document.getElementById('modal-task').classList.add('hidden');
          openGcalModal();
          showGcalFeedback(`Synced "${task.title}" to your primary Google Calendar.`);
        } catch (err) {
          openGcalModal();
          showGcalFeedback(err.message || 'Failed to sync task to Google Calendar.', true);
        }
      }
    });
  });

  document.getElementById('btn-dismiss-reminder').addEventListener('click', () => {
    state.reminderDismissed = true;
    renderReminderBanner();
  });

  document.getElementById('cal-today-btn').addEventListener('click', () => {
    state.calCursor = new Date();
    renderCalendarSection();
  });

  document.getElementById('cal-prev-btn').addEventListener('click', () => {
    if (state.calMode === 'month') {
      state.calCursor = new Date(
        state.calCursor.getFullYear(),
        state.calCursor.getMonth() - 1,
        1
      );
    } else {
      state.calCursor.setDate(state.calCursor.getDate() - 7);
    }
    renderCalendarSection();
  });

  document.getElementById('cal-next-btn').addEventListener('click', () => {
    if (state.calMode === 'month') {
      state.calCursor = new Date(
        state.calCursor.getFullYear(),
        state.calCursor.getMonth() + 1,
        1
      );
    } else {
      state.calCursor.setDate(state.calCursor.getDate() + 7);
    }
    renderCalendarSection();
  });

  document.getElementById('cal-mode-month').addEventListener('click', () => {
    state.calMode = 'month';
    document.getElementById('cal-mode-month').classList.add('active');
    document.getElementById('cal-mode-week').classList.remove('active');
    renderCalendarSection();
  });

  document.getElementById('cal-mode-week').addEventListener('click', () => {
    state.calMode = 'week';
    document.getElementById('cal-mode-week').classList.add('active');
    document.getElementById('cal-mode-month').classList.remove('active');
    renderCalendarSection();
  });

  document.getElementById('close-task-modal').addEventListener('click', () => {
    document.getElementById('modal-task').classList.add('hidden');
  });
  document.getElementById('btn-cancel-task').addEventListener('click', () => {
    document.getElementById('modal-task').classList.add('hidden');
  });

  document.getElementById('btn-add-subtask').addEventListener('click', () => {
    const input = document.getElementById('new-subtask-input');
    const title = input.value.trim();
    if (!title) return;
    state.draftSubtasks.push({ id: `sub-${Date.now()}`, title, completed: false });
    input.value = '';
    renderDraftSubtasks();
  });

  document.getElementById('form-task').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('task-id').value || `task-${Date.now()}`;
    const dateVal = document.getElementById('task-date').value;
    const timeVal = document.getElementById('task-time').value || '23:59';
    const dueIso = new Date(`${dateVal}T${timeVal}`).toISOString();

    const existingIdx = state.tasks.findIndex((t) => t.id === id);
    const prevTask = existingIdx >= 0 ? state.tasks[existingIdx] : {};

    const updated = {
      ...prevTask,
      id,
      title: document.getElementById('task-title').value.trim(),
      priority: document.getElementById('task-priority').value,
      status: document.getElementById('task-status').value,
      source: document.getElementById('task-source').value,
      course: document.getElementById('task-course').value.trim(),
      dueDate: dueIso,
      description: document.getElementById('task-desc').value.trim(),
      subtasks: state.draftSubtasks
    };

    if (existingIdx >= 0) {
      state.tasks[existingIdx] = updated;
    } else {
      state.tasks.unshift(updated);
    }

    document.getElementById('modal-task').classList.add('hidden');
    await persistTask(updated);
  });

  document.getElementById('btn-delete-task').addEventListener('click', async () => {
    if (!state.editingTaskId) return;
    const id = state.editingTaskId;
    state.tasks = state.tasks.filter((t) => t.id !== id);
    document.getElementById('modal-task').classList.add('hidden');
    saveLocalState();
    renderAll();
    if (state.user) {
      await deleteTaskFromFirestore(state.user.uid, id);
    }
  });

  // Moodle Modal Listeners
  document.getElementById('close-moodle-modal').addEventListener('click', () => {
    document.getElementById('modal-moodle').classList.add('hidden');
  });
  document.getElementById('btn-fetch-moodle-api').addEventListener('click', handleFetchMoodleApi);
  document.getElementById('btn-fetch-moodle-ical-url').addEventListener('click', handleFetchMoodleIcalUrl);
  document.getElementById('btn-save-moodle').addEventListener('click', applyMoodleCourseSync);

  document.getElementById('btn-parse-ical').addEventListener('click', async () => {
    const raw = document.getElementById('moodle-ical-input').value.trim();
    if (!raw) {
      showFeedbackBox('moodle-feedback-box', 'Paste VEVENT / VCALENDAR text first.', true);
      return;
    }

    const imported = parseIcsEvents(raw, 'moodle', 'Moodle iCal');
    if (imported.length > 0) {
      const { added, updated } = mergeImportedTasks(imported);
      document.getElementById('moodle-ical-input').value = '';
      saveLocalState();
      renderAll();
      if (state.user) {
        for (const t of imported) {
          await saveTaskToFirestore(state.user.uid, t);
        }
      }
      showFeedbackBox(
        'moodle-feedback-box',
        `Imported ${imported.length} Moodle iCal event(s) (${added} new, ${updated} updated)!`
      );
    } else {
      showFeedbackBox('moodle-feedback-box', 'No valid VEVENT blocks found in pasted text.', true);
    }
  });

  // Classroom Modal Listeners
  document.getElementById('close-classroom-modal').addEventListener('click', () => {
    document.getElementById('modal-classroom').classList.add('hidden');
  });
  document.getElementById('btn-classroom-ical-sync').addEventListener('click', handleClassroomIcalSync);
  document.getElementById('btn-fetch-classroom-api').addEventListener('click', handleFetchClassroomApi);
  document.getElementById('btn-save-classroom').addEventListener('click', applyClassroomCourseSync);

  document.getElementById('close-settings-modal').addEventListener('click', () => {
    document.getElementById('modal-settings').classList.add('hidden');
  });
  document.getElementById('done-settings-modal').addEventListener('click', () => {
    document.getElementById('modal-settings').classList.add('hidden');
  });

  document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.settings.theme = btn.getAttribute('data-theme-choice');
      saveLocalState();
      applyTheme();
      if (state.user) {
        await saveSettingsToFirestore(state.user.uid, state.settings);
      }
    });
  });

  document.getElementById('btn-reset-demo').addEventListener('click', async () => {
    state.moodleCourses = structuredClone(DEFAULT_MOODLE_COURSES);
    state.classroomCourses = structuredClone(DEFAULT_CLASSROOM_COURSES);
    state.tasks = getInitialTasks();
    saveLocalState();
    renderAll();
    if (state.user) {
      await seedWorkspaceToFirestore(
        state.user.uid,
        state.tasks,
        state.moodleCourses,
        state.settings
      );
    }
    document.getElementById('modal-settings').classList.add('hidden');
  });

  document.getElementById('btn-copy-sync-url').addEventListener('click', () => {
    const input = document.getElementById('sync-share-url');
    navigator.clipboard?.writeText(input.value);
    const btn = document.getElementById('btn-copy-sync-url');
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.textContent = 'Copy Link';
    }, 1800);
  });

  if (broadcast) {
    broadcast.onmessage = (event) => {
      if (event.data?.tasks) state.tasks = event.data.tasks;
      if (event.data?.moodleCourses) state.moodleCourses = event.data.moodleCourses;
      if (event.data?.classroomCourses) state.classroomCourses = event.data.classroomCourses;
      if (event.data?.settings) state.settings = event.data.settings;
      if (event.data?.updatedAt) state.updatedAt = event.data.updatedAt;
      saveLocalState(false, false);
      renderAll();
    };
  }

  subscribeAuth((user, token) => {
    state.user = user;
    state.hasGcalToken = Boolean(token);
    if (state.unsubFirestore) {
      state.unsubFirestore();
      state.unsubFirestore = null;
    }

    if (user) {
      state.unsubFirestore = subscribeUserWorkspace(user.uid, {
        onTasks: async (cloudTasks, isEmpty) => {
          if (isEmpty && state.tasks.length > 0) {
            await seedWorkspaceToFirestore(
              user.uid,
              state.tasks,
              state.moodleCourses,
              state.settings
            );
          } else if (!isEmpty) {
            state.tasks = cloudTasks;
            saveLocalState(false);
            renderAll();
          }
        },
        onMoodleCourses: (cloudCourses, isEmpty) => {
          if (!isEmpty) {
            state.moodleCourses = cloudCourses;
            saveLocalState(false);
            renderAll();
          }
        },
        onSettings: (cloudSettings) => {
          if (cloudSettings) {
            state.settings = { ...state.settings, ...cloudSettings };
            saveLocalState(false);
            renderAll();
          }
        }
      });
    }
    renderAll();
  });
}

loadLocalState();
initEvents();
renderAll();
initServerSync();
