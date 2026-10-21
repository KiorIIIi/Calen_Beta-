import { Task, IntegrationSettings, MoodleCourse, ClassroomCourse } from '../types';

function getDateOffset(days: number, hours = 14, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString().slice(0, 16);
}

export const INITIAL_MOODLE_COURSES: MoodleCourse[] = [
  {
    id: 'moodle-cs189',
    fullname: 'CS 189: Introduction to Machine Learning',
    shortname: 'CS 189',
    enabled: true,
    assignmentsCount: 2,
  },
  {
    id: 'moodle-bio1a',
    fullname: 'Bio 1A: General Molecular & Cellular Biology',
    shortname: 'BIO 1A',
    enabled: true,
    assignmentsCount: 2,
  },
  {
    id: 'moodle-math54',
    fullname: 'Math 54: Linear Algebra & Differential Equations',
    shortname: 'MATH 54',
    enabled: true,
    assignmentsCount: 1,
  },
  {
    id: 'moodle-phys7b',
    fullname: 'Physics 7B: Electromagnetism & Thermodynamics',
    shortname: 'PHYS 7B',
    enabled: false,
    assignmentsCount: 1,
  },
];

export const INITIAL_CLASSROOM_COURSES: ClassroomCourse[] = [
  {
    id: 'classroom-ap-lit',
    name: 'AP English Literature',
    section: 'Period 3',
    enabled: true,
    assignmentsCount: 2,
  },
  {
    id: 'classroom-us-hist',
    name: 'AP United States History',
    section: 'Period 5',
    enabled: true,
    assignmentsCount: 1,
  },
  {
    id: 'classroom-gov',
    name: 'Comparative Government & Politics',
    section: 'Period 1',
    enabled: true,
    assignmentsCount: 1,
  },
];

export const INITIAL_SETTINGS: IntegrationSettings = {
  theme: 'light',
  moodle: {
    connected: true,
    instanceUrl: 'https://moodle.university.edu',
    token: 'mdl_demo_token_8892',
    icalUrl: 'https://moodle.university.edu/calendar/export_execute.php?userid=4821&authtoken=abc82937',
    selectedCourses: INITIAL_MOODLE_COURSES,
    lastSync: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    autoSync: true,
  },
  classroom: {
    connected: true,
    email: 'student@school.edu',
    selectedCourses: INITIAL_CLASSROOM_COURSES,
    lastSync: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    autoSync: true,
  },
  notion: {
    connected: true,
    apiKey: 'secret_notion_demo_9921',
    databaseId: 'db_tasks_workspace_2026',
    databaseName: 'Life & Study OS / Master Tasks',
    lastSync: new Date(Date.now() - 1000 * 60 * 62).toISOString(),
  },
  trello: {
    connected: true,
    apiKey: 'trello_key_demo_441',
    boardId: 'board_capstone_project',
    boardName: 'Senior Capstone Sprint Board',
    lastSync: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
};

export const INITIAL_TASKS: Task[] = [
  // Google Classroom tasks
  {
    id: 'task-gc-1',
    title: 'Essay Draft: Analysis of "The Great Gatsby" Character Arc',
    description: 'Submit first 1,500 word draft via Google Classroom document attachment with at least 4 MLA cited quotations.',
    dueDate: getDateOffset(0, 23, 59), // Due today!
    source: 'classroom',
    courseName: 'AP English Literature',
    courseCode: 'AP-LIT',
    moduleName: 'Unit 3: Modernist American Fiction',
    externalUrl: 'https://classroom.google.com/c/MzM4NTQ5MTkyOTc2/a/NjIwOTkyMTA1ODQ4/details',
    status: 'in_progress',
    priority: 'urgent',
    estimatedMinutes: 90,
    reminderMinutesBefore: 120,
    checklist: [
      { id: 'cl-1', text: 'Outline Gatsby vs Nick internal conflict', done: true },
      { id: 'cl-2', text: 'Draft body paragraph 1 & 2', done: true },
      { id: 'cl-3', text: 'Format MLA bibliography entries', done: false },
      { id: 'cl-4', text: 'Run final grammar check and spellcheck', done: false },
    ],
    notes: 'Remember Mrs. Davis specified no casual contractions in academic tone.',
    tags: ['Essay', 'Paper', 'MLA'],
  },
  {
    id: 'task-gc-2',
    title: 'DBQ Practice: Progressive Era Reform Movements',
    description: 'Analyze documents 1-7 and write the contextualization and thesis paragraph for the prompt on child labor and antitrust laws.',
    dueDate: getDateOffset(2, 17, 0),
    source: 'classroom',
    courseName: 'AP United States History',
    courseCode: 'AP-USH',
    moduleName: 'Period 7 (1890-1945)',
    externalUrl: 'https://classroom.google.com/c/NDAyNzU1MTkyMjk4/a/NzE1OTkzMTIzNDAx/details',
    status: 'todo',
    priority: 'high',
    estimatedMinutes: 45,
    reminderMinutesBefore: 180,
    checklist: [
      { id: 'cl-5', text: 'Read documents 1 to 4', done: true },
      { id: 'cl-6', text: 'Read documents 5 to 7', done: false },
      { id: 'cl-7', text: 'Write 4-sentence thesis statement', done: false },
    ],
    tags: ['DBQ', 'History'],
  },
  {
    id: 'task-gc-3',
    title: 'Parliamentary System vs Presidential Case Study',
    description: 'Submit the short comparative matrix worksheet on UK vs US executive powers.',
    dueDate: getDateOffset(4, 15, 30),
    source: 'classroom',
    courseName: 'Comparative Government & Politics',
    courseCode: 'GOV-101',
    moduleName: 'Institutions of Government',
    externalUrl: 'https://classroom.google.com/c/ODkyOTE0MjI1Nzc0/a/ODA1OTY0MjMxMDk4/details',
    status: 'todo',
    priority: 'medium',
    estimatedMinutes: 30,
    tags: ['Worksheet'],
  },

  // Moodle tasks
  {
    id: 'task-moodle-1',
    title: 'Problem Set 4: Neural Networks Backpropagation Derivation',
    description: 'Complete questions 1 to 5 showing full matrix gradient calculus. Submit PDF scan to Moodle Assignment dropbox.',
    dueDate: getDateOffset(1, 23, 59), // Due tomorrow night!
    source: 'moodle',
    courseName: 'CS 189: Introduction to Machine Learning',
    courseCode: 'CS 189',
    moduleName: 'Module 4: Deep Learning Foundations',
    externalUrl: 'https://moodle.university.edu/mod/assign/view.php?id=89234',
    status: 'in_progress',
    priority: 'urgent',
    estimatedMinutes: 120,
    reminderMinutesBefore: 240,
    checklist: [
      { id: 'cl-8', text: 'Derive Jacobian for softmax cross-entropy loss', done: true },
      { id: 'cl-9', text: 'Write vectorized backprop equations in LaTeX', done: true },
      { id: 'cl-10', text: 'Verify numerical gradient check in Jupyter notebook', done: false },
      { id: 'cl-11', text: 'Compile LaTeX to PDF and verify formatting', done: false },
    ],
    notes: 'Late policy: 10% penalty per 24 hours. Grace period of 15 minutes applies.',
    tags: ['Calculus', 'PyTorch', 'Latex'],
  },
  {
    id: 'task-moodle-2',
    title: 'Lab Report 2: PCR Amplification & Gel Electrophoresis',
    description: 'Upload standard formal lab report including annotated gel photograph with lane labels and DNA ladder size chart.',
    dueDate: getDateOffset(3, 18, 0),
    source: 'moodle',
    courseName: 'Bio 1A: General Molecular & Cellular Biology',
    courseCode: 'BIO 1A',
    moduleName: 'Laboratory Unit B: Molecular Genetics',
    externalUrl: 'https://moodle.university.edu/mod/assign/view.php?id=90112',
    status: 'todo',
    priority: 'high',
    estimatedMinutes: 90,
    checklist: [
      { id: 'cl-12', text: 'Crop and label UV transilluminator gel photo', done: true },
      { id: 'cl-13', text: 'Calculate base pair standard curve in Excel', done: false },
      { id: 'cl-14', text: 'Write Discussion section explaining band intensity', done: false },
    ],
    tags: ['Lab', 'Biology'],
  },
  {
    id: 'task-moodle-3',
    title: 'Online Quiz 3: Eigenvalues, Diagonalization & SVD',
    description: 'Timed 45-minute Moodle online quiz. 15 randomized multiple choice & numeric input questions.',
    dueDate: getDateOffset(5, 12, 0),
    source: 'moodle',
    courseName: 'Math 54: Linear Algebra & Differential Equations',
    courseCode: 'MATH 54',
    moduleName: 'Chapter 5: Eigenspaces',
    externalUrl: 'https://moodle.university.edu/mod/quiz/view.php?id=94520',
    status: 'todo',
    priority: 'medium',
    estimatedMinutes: 45,
    tags: ['Quiz', 'Math'],
  },

  // Notion tasks
  {
    id: 'task-notion-1',
    title: 'Internship Portfolio Case Study: HealthTech Redesign',
    description: 'Finalize Figma prototype walkthrough video and publish Notion portfolio case study subpage.',
    dueDate: getDateOffset(3, 20, 0),
    source: 'notion',
    courseName: 'Personal Career OS',
    externalUrl: 'https://notion.so/workspace/HealthTech-Case-Study-78923a',
    status: 'in_progress',
    priority: 'medium',
    estimatedMinutes: 60,
    tags: ['Career', 'Design'],
  },
  {
    id: 'task-notion-2',
    title: 'Weekly Knowledge Synthesis & Spaced Repetition Review',
    description: 'Process all fleeting notes in Notion inbox into evergreen literature notes in the Zettelkasten database.',
    dueDate: getDateOffset(0, 21, 0), // Today!
    source: 'notion',
    courseName: 'Study OS',
    externalUrl: 'https://notion.so/workspace/Weekly-Review-8823f',
    status: 'todo',
    priority: 'low',
    estimatedMinutes: 30,
    tags: ['Habits', 'Review'],
  },

  // Trello tasks
  {
    id: 'task-trello-1',
    title: 'Capstone: Finish Hardware Architecture Block Diagram',
    description: 'Collaborate with team on Lucidchart schematic for sensor telemetry transmission over BLE.',
    dueDate: getDateOffset(2, 16, 0),
    source: 'trello',
    courseName: 'Senior Capstone Sprint Board',
    externalUrl: 'https://trello.com/c/9m10K2p/42-hardware-diagram',
    status: 'in_progress',
    priority: 'high',
    estimatedMinutes: 75,
    tags: ['Sprint', 'Hardware'],
  },
  {
    id: 'task-trello-2',
    title: 'Submit Capstone Budget Approval Form to Department',
    description: 'Collect signed expense sheet for microcontroller components and pass to engineering office.',
    dueDate: getDateOffset(-1, 17, 0), // Yesterday (overdue test!)
    source: 'trello',
    courseName: 'Senior Capstone Sprint Board',
    externalUrl: 'https://trello.com/c/7n38b9A/15-budget-form',
    status: 'todo',
    priority: 'urgent',
    estimatedMinutes: 20,
    tags: ['Admin', 'Capstone'],
  },

  // Personal task
  {
    id: 'task-pers-1',
    title: 'Schedule Advisor Meeting for Fall Registration',
    description: 'Book a 15-minute slot via Calendly for degree requirement audit before course enrollment opens.',
    dueDate: getDateOffset(1, 11, 0),
    source: 'personal',
    status: 'todo',
    priority: 'medium',
    estimatedMinutes: 15,
    tags: ['Advising'],
  },
  {
    id: 'task-pers-2',
    title: 'Submit FAFSA Renewal Application',
    description: 'Double-check tax transcripts and electronically sign financial aid declaration.',
    dueDate: getDateOffset(-3, 12, 0),
    source: 'personal',
    status: 'completed',
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    priority: 'high',
    tags: ['Finance'],
  },
];
