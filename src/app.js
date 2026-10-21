import {
  loginWithGoogle,
  logoutUser,
  subscribeAuth,
  subscribeUserWorkspace,
  saveTaskToFirestore,
  deleteTaskFromFirestore,
  saveMoodleCoursesToFirestore,
  saveSettingsToFirestore,
  seedWorkspaceToFirestore
} from './firebase.js';

const STORAGE_KEYS = {
  TASKS: 'calen_html_tasks_v2',
  COURSES: 'calen_html_moodle_courses_v2',
  SETTINGS: 'calen_html_settings_v2'
};

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

function getInitialTasks() {
  const baseTasks = [
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
    },
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

  return [...syncedMoodleTasks, ...baseTasks];
}

// Application State
const state = {
  activeView: 'tasks', // 'tasks' | 'calendar'
  subView: 'table', // 'table' | 'priority' | 'platform' | 'board'
  calMode: 'month', // 'month' | 'week'
  calCursor: new Date(),
  priorityFilter: 'all', // 'all' | 'urgent' | 'high' | 'medium' | 'low'
  sourceFilter: 'all',
  statusFilter: 'all',
  searchQuery: '',
  sortBy: 'priority',
  reminderDismissed: false,
  editingTaskId: null,
  draftSubtasks: [],
  user: null,
  unsubFirestore: null,
  tasks: [],
  moodleCourses: [],
  settings: {
    theme: 'dark', // 'light' | 'dark' | 'system'
    platforms: {
      moodle: true,
      google_classroom: true,
      notion: true,
      trello: true
    }
  }
};

const broadcast =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('calen_sync_channel') : null;

// Load initial state from LocalStorage or URL hash
function loadLocalState() {
  try {
    if (window.location.hash.startsWith('#sync=')) {
      const encoded = window.location.hash.replace('#sync=', '');
      const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
      if (Array.isArray(decoded.tasks)) {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(decoded.tasks));
      }
      window.history.replaceState(null, '', window.location.pathname);
    }

    const rawCourses = localStorage.getItem(STORAGE_KEYS.COURSES);
    state.moodleCourses = rawCourses ? JSON.parse(rawCourses) : structuredClone(DEFAULT_MOODLE_COURSES);

    const rawTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    state.tasks = rawTasks ? JSON.parse(rawTasks) : getInitialTasks();

    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSettings) {
      state.settings = { ...state.settings, ...JSON.parse(rawSettings) };
    }
  } catch (e) {
    console.warn('Fallback to default state:', e);
    state.moodleCourses = structuredClone(DEFAULT_MOODLE_COURSES);
    state.tasks = getInitialTasks();
  }
}

function saveLocalState(broadcastUpdate = true) {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks));
  localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(state.moodleCourses));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));

  if (broadcastUpdate && broadcast) {
    broadcast.postMessage({
      tasks: state.tasks,
      moodleCourses: state.moodleCourses,
      settings: state.settings
    });
  }
}

// Theme Management
function applyTheme() {
  const mode = state.settings.theme || 'dark';
  const prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark);

  document.documentElement.classList.toggle('dark', isDark);

  const iconEl = document.getElementById('theme-quick-icon');
  if (iconEl) {
    iconEl.innerHTML = isDark
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  }

  document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-theme-choice') === mode);
  });
}

// Badge & Formatting Helpers
const PRIORITY_META = {
  urgent: { label: 'Urgent', badgeClass: 'badge-rose', rowClass: 'row-urgent', weight: 4 },
  high: { label: 'High', badgeClass: 'badge-peach', rowClass: 'row-high', weight: 3 },
  medium: { label: 'Medium', badgeClass: 'badge-butter', rowClass: 'row-medium', weight: 2 },
  low: { label: 'Low', badgeClass: 'badge-stone', rowClass: 'row-low', weight: 1 }
};

const SOURCE_META = {
  moodle: { label: 'Moodle', badgeClass: 'badge-peach' },
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
    if (state.statusFilter === 'pending' && task.status === 'completed') {
      return false;
    }
    if (state.statusFilter === 'completed' && task.status !== 'completed') {
      return false;
    }
    if (state.statusFilter === 'today') {
      const d = new Date(task.dueDate);
      const now = new Date();
      if (
        d.getFullYear() !== now.getFullYear() ||
        d.getMonth() !== now.getMonth() ||
        d.getDate() !== now.getDate()
      ) {
        return false;
      }
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
// RENDERING
// ============================================================================
function renderAll() {
  applyTheme();
  renderHeaderState();
  renderReminderBanner();
  renderPriorityFocusBar();
  renderTasksSection();
  renderCalendarSection();
}

function renderHeaderState() {
  const syncedCount = state.moodleCourses.filter((c) => c.synced).length;
  const moodleBtnLabel = document.getElementById('moodle-btn-label');
  if (moodleBtnLabel) {
    moodleBtnLabel.textContent = `Moodle (${syncedCount})`;
  }

  const classroomBtn = document.getElementById('btn-classroom-toggle');
  if (classroomBtn) {
    classroomBtn.classList.toggle('pastel-sage', state.settings.platforms.google_classroom !== false);
  }

  const cloudLabel = document.getElementById('cloud-auth-label');
  const modalCloudBtn = document.getElementById('btn-modal-cloud-login');
  const syncSub = document.getElementById('sync-cloud-subtitle');
  if (state.user) {
    const shortName = state.user.displayName?.split(' ')[0] || state.user.email || 'Cloud Synced';
    if (cloudLabel) cloudLabel.textContent = `Cloud: ${shortName}`;
    if (modalCloudBtn) modalCloudBtn.textContent = 'Sign Out';
    if (syncSub) syncSub.textContent = `Signed in as ${state.user.email} — live Firestore sync active`;
  } else {
    if (cloudLabel) cloudLabel.textContent = 'Sign in to Cloud';
    if (modalCloudBtn) modalCloudBtn.textContent = 'Sign In with Google';
    if (syncSub)
      syncSub.textContent = 'Sign in with Google to automatically sync tasks in real time';
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
  textEl.innerHTML = `<strong>${dueInfo.isOverdue ? 'Overdue Deadline:' : 'Upcoming Deadline:'}</strong> "${escapeHtml(
    topTask.title
  )}" (${escapeHtml(topTask.course || SOURCE_META[topTask.source]?.label)}) — Due ${escapeHtml(
    dueInfo.text
  )}`;

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
    { key: 'all', label: 'All Levels', tone: '' },
    { key: 'urgent', label: 'Urgent', tone: 'tone-urgent' },
    { key: 'high', label: 'High', tone: 'tone-high' },
    { key: 'medium', label: 'Medium', tone: 'tone-medium' },
    { key: 'low', label: 'Low', tone: 'tone-low' }
  ];

  bar.innerHTML = `
    <span class="priority-focus-label">Priority Focus:</span>
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
            <span class="prio-pill-count">(${counts[item.key]})</span>
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
      <div class="table-card" style="padding:36px;text-align:center;color:var(--text-secondary);">
        No assignments match the current filter. Try clearing filters or adding a new task above.
      </div>
    `;
  }

  return `
    <div class="table-card">
      <div class="table-scroll">
        <table class="task-table">
          <thead>
            <tr>
              <th class="col-check">Done</th>
              <th class="col-title">Task / Assignment Title</th>
              <th class="col-priority">Priority</th>
              <th class="col-source">Platform / Course</th>
              <th class="col-due">Due Date &amp; Time</th>
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

                return `
                  <tr class="task-row ${prio.rowClass}" data-row-id="${escapeHtml(task.id)}">
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
                            ? `<span class="subtask-counter">${doneSub}/${subtasks.length}</span>`
                            : ''
                        }
                      </div>
                    </td>
                    <td class="col-priority" data-action="cycle-priority" data-id="${escapeHtml(
                      task.id
                    )}" title="Click to cycle priority level">
                      <span class="badge ${prio.badgeClass}">
                        <span class="badge-dot"></span>
                        <span>${prio.label}</span>
                      </span>
                    </td>
                    <td class="col-source">
                      <span class="badge ${src.badgeClass}">
                        <span class="badge-dot"></span>
                        <span>${escapeHtml(task.course || src.label)}</span>
                      </span>
                    </td>
                    <td class="col-due">
                      <div class="due-cell-inner ${due.isOverdue && !isDone ? 'overdue' : ''}">
                        <span>${escapeHtml(due.text)}</span>
                        ${
                          due.isOverdue && !isDone
                            ? `<span class="late-tag">Late</span>`
                            : ''
                        }
                      </div>
                    </td>
                    <td class="col-status" data-action="cycle-status" data-id="${escapeHtml(
                      task.id
                    )}" title="Click to cycle status">
                      <span class="badge ${st.badgeClass}">
                        <span class="badge-dot"></span>
                        <span>${st.label}</span>
                      </span>
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
    </div>
  `;
}

function renderTasksSection() {
  const container = document.getElementById('tasks-container');
  const totalChip = document.getElementById('task-total-chip');
  if (!container) return;

  const filtered = sortTasks(getVisibleTasks());
  if (totalChip) {
    totalChip.textContent = `${filtered.length} shown`;
  }

  if (state.subView === 'table') {
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
              <div class="table-card">
                <div class="group-header">
                  <span class="badge ${meta.badgeClass}">
                    <span class="badge-dot"></span>
                    <span>${meta.label} Priority</span>
                  </span>
                  <span class="count-chip">${groupTasks.length} tasks</span>
                </div>
                ${
                  groupTasks.length > 0
                    ? buildTableHtml(groupTasks)
                    : `<div style="padding:18px;font-size:13px;color:var(--text-muted);">No tasks in ${meta.label} priority.</div>`
                }
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  } else if (state.subView === 'platform') {
    const sources = ['moodle', 'google_classroom', 'notion', 'trello', 'personal'];
    container.innerHTML = `
      <div class="group-stack">
        ${sources
          .map((srcKey) => {
            const groupTasks = filtered.filter((t) => t.source === srcKey);
            const meta = SOURCE_META[srcKey];
            return `
              <div class="table-card">
                <div class="group-header">
                  <span class="badge ${meta.badgeClass}">
                    <span class="badge-dot"></span>
                    <span>${meta.label}</span>
                  </span>
                  <span class="count-chip">${groupTasks.length} tasks</span>
                </div>
                ${
                  groupTasks.length > 0
                    ? buildTableHtml(groupTasks)
                    : `<div style="padding:18px;font-size:13px;color:var(--text-muted);">No tasks synced from ${meta.label}.</div>`
                }
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  } else if (state.subView === 'board') {
    const columns = [
      { key: 'todo', label: 'To Do', badge: 'badge-stone' },
      { key: 'in_progress', label: 'In Progress', badge: 'badge-sky' },
      { key: 'completed', label: 'Completed', badge: 'badge-sage' }
    ];
    container.innerHTML = `
      <div class="kanban-grid">
        ${columns
          .map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.key);
            return `
              <div class="kanban-col">
                <div class="kanban-col-hdr">
                  <span class="badge ${col.badge}">
                    <span class="badge-dot"></span>
                    <span>${col.label}</span>
                  </span>
                  <span class="count-chip">${colTasks.length}</span>
                </div>
                ${colTasks
                  .map((task) => {
                    const prio = PRIORITY_META[task.priority] || PRIORITY_META.medium;
                    const src = SOURCE_META[task.source] || SOURCE_META.personal;
                    const due = formatDueDate(task.dueDate);
                    return `
                      <div class="kanban-card" data-row-id="${escapeHtml(task.id)}">
                        <div class="kanban-card-top">
                          <span class="badge ${prio.badgeClass}">
                            <span class="badge-dot"></span>
                            <span>${prio.label}</span>
                          </span>
                          <span class="badge ${src.badgeClass}">${escapeHtml(
                            task.course || src.label
                          )}</span>
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

  attachTaskTableListeners(container);
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
                  <span class="badge-dot" style="background:var(--${
                    task.priority === 'urgent'
                      ? 'rose'
                      : task.priority === 'high'
                      ? 'peach'
                      : task.priority === 'medium'
                      ? 'butter'
                      : 'stone'
                  }-dot)"></span>
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
// TASK MUTATIONS + FIREBASE PERSISTENCE
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
// MODALS LOGIC
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
  renderDraftSubtasks();
  document.getElementById('modal-task').classList.remove('hidden');
}

function renderDraftSubtasks() {
  const listEl = document.getElementById('task-subtasks-list');
  if (!listEl) return;

  listEl.innerHTML = state.draftSubtasks
    .map(
      (sub, idx) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-radius:6px;background:var(--bg-subtle);border:1px solid var(--border-color);">
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

function openMoodleModal() {
  const listEl = document.getElementById('moodle-courses-list');
  if (!listEl) return;

  listEl.innerHTML = state.moodleCourses
    .map(
      (course) => `
      <label class="course-item ${course.synced ? 'selected' : ''}" data-course-id="${escapeHtml(
        course.id
      )}">
        <div style="display:flex;align-items:center;gap:10px;">
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
        <span class="badge badge-peach">${course.synced ? 'Synced' : 'Available'}</span>
      </label>
    `
    )
    .join('');

  listEl.querySelectorAll('.moodle-course-chk').forEach((chk) => {
    chk.addEventListener('change', () => {
      const course = state.moodleCourses.find((c) => c.id === chk.value);
      if (course) {
        course.synced = chk.checked;
        openMoodleModal();
      }
    });
  });

  document.getElementById('modal-moodle').classList.remove('hidden');
}

async function applyMoodleCourseSync() {
  const syncedCourseIds = new Set(state.moodleCourses.filter((c) => c.synced).map((c) => c.code));

  // Keep non-moodle tasks and custom moodle tasks, plus tasks for synced courses
  const nonCourseMoodleTasks = state.tasks.filter(
    (t) =>
      t.source !== 'moodle' ||
      (!t.id.startsWith('mdl-task-') && syncedCourseIds.has(t.course))
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

function openSettingsModal() {
  const listEl = document.getElementById('settings-integrations-list');
  if (listEl) {
    const platforms = [
      { key: 'moodle', name: 'Moodle LMS API & iCal', badge: 'badge-peach' },
      { key: 'google_classroom', name: 'Google Classroom Courses', badge: 'badge-sage' },
      { key: 'notion', name: 'Notion Workspace Databases', badge: 'badge-stone' },
      { key: 'trello', name: 'Trello Project Boards', badge: 'badge-sky' }
    ];

    listEl.innerHTML = platforms
      .map(
        (p) => `
        <label style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-subtle);cursor:pointer;">
          <span class="badge ${p.badge}">
            <span class="badge-dot"></span>
            <span>${p.name}</span>
          </span>
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

  applyTheme();
  document.getElementById('modal-settings').classList.remove('hidden');
}

function openSyncModal() {
  const input = document.getElementById('sync-share-url');
  if (input) {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ tasks: state.tasks }))));
    input.value = `${window.location.origin}${window.location.pathname}#sync=${payload}`;
  }
  document.getElementById('modal-sync').classList.remove('hidden');
}

// ============================================================================
// EVENT LISTENERS & INITIALIZATION
// ============================================================================
function initEvents() {
  // Primary View Switcher
  document.getElementById('tab-tasks').addEventListener('click', () => {
    state.activeView = 'tasks';
    document.getElementById('tab-tasks').classList.add('active');
    document.getElementById('tab-calendar').classList.remove('active');
    document.getElementById('view-tasks').classList.remove('hidden');
    document.getElementById('view-calendar').classList.add('hidden');
  });

  document.getElementById('tab-calendar').addEventListener('click', () => {
    state.activeView = 'calendar';
    document.getElementById('tab-calendar').classList.add('active');
    document.getElementById('tab-tasks').classList.remove('active');
    document.getElementById('view-calendar').classList.remove('hidden');
    document.getElementById('view-tasks').classList.add('hidden');
    renderCalendarSection();
  });

  // Sub-views (Table, By Priority, By Platform, Board)
  document.querySelectorAll('.subview-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.subView = btn.getAttribute('data-subview');
      document.querySelectorAll('.subview-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderTasksSection();
    });
  });

  // Search & Filters
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

  // Quick Add Bar
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

  // Header Buttons
  document.getElementById('btn-new-task').addEventListener('click', () => openNewTaskModal());
  document.getElementById('btn-moodle-modal').addEventListener('click', openMoodleModal);
  document.getElementById('btn-settings-modal').addEventListener('click', openSettingsModal);
  document.getElementById('btn-sync-modal').addEventListener('click', openSyncModal);

  document.getElementById('btn-classroom-toggle').addEventListener('click', async () => {
    state.settings.platforms.google_classroom = !state.settings.platforms.google_classroom;
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

  // Cloud Auth Button
  const handleCloudAuthClick = async () => {
    try {
      if (state.user) {
        await logoutUser();
      } else {
        await loginWithGoogle();
      }
    } catch (err) {
      console.error('Authentication action failed:', err);
    }
  };
  document.getElementById('btn-cloud-auth').addEventListener('click', handleCloudAuthClick);
  document.getElementById('btn-modal-cloud-login').addEventListener('click', handleCloudAuthClick);

  // Reminder Banner Dismiss
  document.getElementById('btn-dismiss-reminder').addEventListener('click', () => {
    state.reminderDismissed = true;
    renderReminderBanner();
  });

  // Calendar Controls
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

  // Task Modal Form
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

    const updated = {
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

    const existingIdx = state.tasks.findIndex((t) => t.id === id);
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

  // Moodle Modal Controls
  document.getElementById('close-moodle-modal').addEventListener('click', () => {
    document.getElementById('modal-moodle').classList.add('hidden');
  });
  document.getElementById('btn-save-moodle').addEventListener('click', applyMoodleCourseSync);

  document.getElementById('btn-parse-ical').addEventListener('click', async () => {
    const raw = document.getElementById('moodle-ical-input').value.trim();
    if (!raw) return;

    const blocks = raw.split('BEGIN:VEVENT').slice(1);
    const imported = [];
    blocks.forEach((b, i) => {
      const summaryMatch = b.match(/SUMMARY:(.*)/);
      const dtMatch = b.match(/DTEND(?:;[^:]*)?:(\d{8}T\d{6}Z?)/) || b.match(/DTSTART(?:;[^:]*)?:(\d{8}T\d{6}Z?)/);
      const title = summaryMatch ? summaryMatch[1].trim() : `Moodle Event #${i + 1}`;
      let dueDate = offsetDateISO(2, 23, 59);
      if (dtMatch) {
        const s = dtMatch[1];
        const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(
          11,
          13
        )}:00Z`;
        const parsed = new Date(iso);
        if (!Number.isNaN(parsed.getTime())) dueDate = parsed.toISOString();
      }
      imported.push({
        id: `mdl-ical-${Date.now()}-${i}`,
        title,
        priority: 'high',
        status: 'todo',
        source: 'moodle',
        course: 'Moodle iCal',
        dueDate,
        description: 'Imported via Moodle iCal (.ics) feed',
        subtasks: []
      });
    });

    if (imported.length > 0) {
      state.tasks = [...imported, ...state.tasks];
      document.getElementById('moodle-ical-input').value = '';
      saveLocalState();
      renderAll();
      if (state.user) {
        for (const t of imported) {
          await saveTaskToFirestore(state.user.uid, t);
        }
      }
      document.getElementById('modal-moodle').classList.add('hidden');
    }
  });

  // Settings Modal Controls
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

  // Sync Modal Controls
  document.getElementById('close-sync-modal').addEventListener('click', () => {
    document.getElementById('modal-sync').classList.add('hidden');
  });
  document.getElementById('done-sync-modal').addEventListener('click', () => {
    document.getElementById('modal-sync').classList.add('hidden');
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

  // Cross-tab BroadcastChannel listener
  if (broadcast) {
    broadcast.onmessage = (event) => {
      if (event.data?.tasks) state.tasks = event.data.tasks;
      if (event.data?.moodleCourses) state.moodleCourses = event.data.moodleCourses;
      if (event.data?.settings) state.settings = event.data.settings;
      saveLocalState(false);
      renderAll();
    };
  }

  // Firebase Auth & Real-Time Firestore Subscription
  subscribeAuth((user) => {
    state.user = user;
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

// Bootstrap Application
loadLocalState();
initEvents();
renderAll();
