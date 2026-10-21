export type TaskSource = 'classroom' | 'moodle' | 'notion' | 'trello' | 'personal';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO string YYYY-MM-DDTHH:mm
  source: TaskSource;
  courseName?: string;
  courseCode?: string;
  moduleName?: string;
  externalUrl?: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedMinutes?: number;
  reminderMinutesBefore?: number;
  completedAt?: string;
  checklist?: ChecklistItem[];
  notes?: string;
  tags?: string[];
}

export interface MoodleCourse {
  id: string;
  fullname: string;
  shortname: string;
  enabled: boolean;
  assignmentsCount: number;
}

export interface MoodleIntegrationConfig {
  connected: boolean;
  instanceUrl: string;
  token: string;
  icalUrl: string;
  selectedCourses: MoodleCourse[];
  lastSync?: string;
  autoSync: boolean;
}

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  enabled: boolean;
  assignmentsCount: number;
}

export interface ClassroomIntegrationConfig {
  connected: boolean;
  email?: string;
  selectedCourses: ClassroomCourse[];
  lastSync?: string;
  autoSync: boolean;
}

export interface NotionIntegrationConfig {
  connected: boolean;
  apiKey: string;
  databaseId: string;
  databaseName?: string;
  lastSync?: string;
}

export interface TrelloIntegrationConfig {
  connected: boolean;
  apiKey: string;
  boardId: string;
  boardName?: string;
  lastSync?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface IntegrationSettings {
  theme: ThemeMode;
  moodle: MoodleIntegrationConfig;
  classroom: ClassroomIntegrationConfig;
  notion: NotionIntegrationConfig;
  trello: TrelloIntegrationConfig;
}

export type ViewMode = 'tasks' | 'calendar';
export type TaskListViewType = 'table' | 'by-source' | 'by-priority' | 'kanban';
export type CalendarViewType = 'month' | 'week';
