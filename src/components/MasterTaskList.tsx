import React, { useState } from 'react';
import { Task, TaskSource, TaskStatus, TaskPriority, TaskListViewType } from '../types';
import { SourceBadge } from './SourceBadge';
import { PriorityBadge } from './PriorityBadge';
import { 
  Search, 
  ArrowUpDown, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  ExternalLink, 
  LayoutList, 
  Columns3, 
  Layers, 
  Flame,
  ArrowUp,
  Minus,
  ArrowDown,
  ListFilter
} from 'lucide-react';
import { playSuccessChime } from '../services/audioChime';

interface Props {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onAddTask: (newTask: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

export const MasterTaskList: React.FC<Props> = ({
  tasks,
  onSelectTask,
  onUpdateTask,
  onAddTask,
}) => {
  const [viewType, setViewType] = useState<TaskListViewType>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [quickInputTitle, setQuickInputTitle] = useState('');
  const [quickInputSource, setQuickInputSource] = useState<TaskSource>('personal');
  const [quickInputPriority, setQuickInputPriority] = useState<TaskPriority>('medium');
  const [sortBy, setSortBy] = useState<'due' | 'priority' | 'title'>('priority');

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchCourse = (task.courseName || '').toLowerCase().includes(q);
      const matchCode = (task.courseCode || '').toLowerCase().includes(q);
      const matchDesc = (task.description || '').toLowerCase().includes(q);
      const matchTags = (task.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchCourse && !matchCode && !matchDesc && !matchTags) {
        return false;
      }
    }

    if (selectedSource !== 'all' && task.source !== selectedSource) {
      return false;
    }

    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    if (statusFilter === 'pending' && task.status === 'completed') return false;
    if (statusFilter === 'completed' && task.status !== 'completed') return false;
    if (statusFilter === 'today') {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (!task.dueDate.startsWith(todayStr)) return false;
    }

    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const weights: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      const diff = weights[b.priority] - weights[a.priority];
      if (diff !== 0) return diff;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (sortBy === 'due') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return a.title.localeCompare(b.title);
  });

  const handleToggleTaskStatus = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
    if (nextStatus === 'completed') {
      playSuccessChime();
    }
    onUpdateTask({
      ...task,
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
    });
  };

  const handleCyclePriority = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const priorityCycle: Record<TaskPriority, TaskPriority> = {
      urgent: 'high',
      high: 'medium',
      medium: 'low',
      low: 'urgent',
    };
    onUpdateTask({
      ...task,
      priority: priorityCycle[task.priority],
    });
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInputTitle.trim()) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);

    onAddTask({
      title: quickInputTitle.trim(),
      source: quickInputSource,
      dueDate: tomorrow.toISOString().slice(0, 16),
      status: 'todo',
      priority: quickInputPriority,
    });

    setQuickInputTitle('');
  };

  const formatDueDateDisplay = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = d.toDateString() === tomorrow.toDateString();

      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isToday) return `Today, ${timeStr}`;
      if (isTomorrow) return `Tomorrow, ${timeStr}`;

      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    } catch {
      return iso;
    }
  };

  // Subtle left border indicator for priority
  const getPriorityLeftBorder = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-[3px] border-l-[#d67a7a] dark:border-l-[#b85656]';
      case 'high':
        return 'border-l-[3px] border-l-[#de9366] dark:border-l-[#ba7247]';
      case 'medium':
        return 'border-l-[3px] border-l-[#dbc06b] dark:border-l-[#b09644]';
      case 'low':
      default:
        return 'border-l-[3px] border-l-transparent';
    }
  };

  const getStatusBadgeStyle = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-[#eef4ee] text-[#2d5c41] border-[#d7e5d6] dark:bg-[#1a2820] dark:text-[#9ed1b2] dark:border-[#294233]';
      case 'in_progress':
        return 'bg-[#edf4f9] text-[#275c7d] border-[#d0e2ee] dark:bg-[#1a2631] dark:text-[#a2cde8] dark:border-[#293d4d]';
      case 'todo':
      default:
        return 'bg-[#f2f1ef] text-[#5e5c59] border-[#e0deda] dark:bg-[#262626] dark:text-[#c2c0bc] dark:border-[#383838]';
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'todo':
      default:
        return 'To Do';
    }
  };

  // Priority counts for quick filter pills
  const countsByPriority = {
    all: tasks.length,
    urgent: tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length,
    high: tasks.filter((t) => t.priority === 'high' && t.status !== 'completed').length,
    medium: tasks.filter((t) => t.priority === 'medium' && t.status !== 'completed').length,
    low: tasks.filter((t) => t.priority === 'low' && t.status !== 'completed').length,
  };

  const sourceGroups: { key: TaskSource; label: string; count: number }[] = [
    { key: 'classroom', label: 'Google Classroom', count: tasks.filter((t) => t.source === 'classroom').length },
    { key: 'moodle', label: 'Moodle LMS', count: tasks.filter((t) => t.source === 'moodle').length },
    { key: 'notion', label: 'Notion Database', count: tasks.filter((t) => t.source === 'notion').length },
    { key: 'trello', label: 'Trello Board', count: tasks.filter((t) => t.source === 'trello').length },
    { key: 'personal', label: 'Personal & Direct', count: tasks.filter((t) => t.source === 'personal').length },
  ];

  const priorityGroups: { key: TaskPriority; label: string; desc: string; icon: typeof Flame; bg: string; count: number }[] = [
    {
      key: 'urgent',
      label: 'Urgent Priority',
      desc: 'Critical cutoff deadlines & overdue submissions',
      icon: Flame,
      bg: 'bg-[#faebeb] text-[#9c3434] border-[#f4cccc] dark:bg-[#2b1919] dark:text-[#f29b9b] dark:border-[#482828]',
      count: tasks.filter((t) => t.priority === 'urgent').length,
    },
    {
      key: 'high',
      label: 'High Priority',
      desc: 'Upcoming major exams, projects & problem sets',
      icon: ArrowUp,
      bg: 'bg-[#faf0e8] text-[#944e1c] border-[#f1dac9] dark:bg-[#2a1c14] dark:text-[#f0ad7d] dark:border-[#483023]',
      count: tasks.filter((t) => t.priority === 'high').length,
    },
    {
      key: 'medium',
      label: 'Medium Priority',
      desc: 'Regular homework, readings & ongoing coursework',
      icon: Minus,
      bg: 'bg-[#fbf5e5] text-[#7d5d14] border-[#f0e3bf] dark:bg-[#292415] dark:text-[#e8c76b] dark:border-[#42391e]',
      count: tasks.filter((t) => t.priority === 'medium').length,
    },
    {
      key: 'low',
      label: 'Low Priority',
      desc: 'Long-term goals, reviews & optional reading',
      icon: ArrowDown,
      bg: 'bg-[#f2f1ef] text-[#5e5c59] border-[#e0deda] dark:bg-[#232322] dark:text-[#c4c2be] dark:border-[#383735]',
      count: tasks.filter((t) => t.priority === 'low').length,
    },
  ];

  const kanbanColumns: { status: TaskStatus; label: string }[] = [
    { status: 'todo', label: 'To Do' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in">
      {/* Title & View Style Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#e8e7e3] dark:border-[#2a2a2a]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#ececec]">
              Master Task List
            </h1>
            <span className="text-xs font-medium text-[#787774] dark:text-[#a0a0a0] bg-[#f1f1ef] dark:bg-[#252525] px-2.5 py-0.5 rounded-full border border-[#e5e4e0] dark:border-[#333333] whitespace-nowrap">
              {tasks.length} total
            </span>
          </div>
          <p className="text-xs text-[#787774] dark:text-[#9b9b9b] mt-1">
            Unified student assignments & tasks with visual priority badges to focus on what matters first
          </p>
        </div>

        {/* View Style Switcher */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <div className="flex items-center p-1 bg-[#f1f1ef] dark:bg-[#242424] rounded-lg text-xs font-medium border border-[#e5e4e0] dark:border-[#333333]">
            <button
              onClick={() => setViewType('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                viewType === 'table'
                  ? 'bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#f0f0f0] shadow-2xs font-semibold'
                  : 'text-[#787774] dark:text-[#9b9b9b] hover:text-[#37352f] dark:hover:text-[#e0e0e0]'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5 shrink-0" />
              <span>Table</span>
            </button>

            <button
              onClick={() => setViewType('by-priority')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                viewType === 'by-priority'
                  ? 'bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#f0f0f0] shadow-2xs font-semibold'
                  : 'text-[#787774] dark:text-[#9b9b9b] hover:text-[#37352f] dark:hover:text-[#e0e0e0]'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 shrink-0" />
              <span>By Priority</span>
            </button>

            <button
              onClick={() => setViewType('by-source')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                viewType === 'by-source'
                  ? 'bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#f0f0f0] shadow-2xs font-semibold'
                  : 'text-[#787774] dark:text-[#9b9b9b] hover:text-[#37352f] dark:hover:text-[#e0e0e0]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>By Platform</span>
            </button>

            <button
              onClick={() => setViewType('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                viewType === 'kanban'
                  ? 'bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#f0f0f0] shadow-2xs font-semibold'
                  : 'text-[#787774] dark:text-[#9b9b9b] hover:text-[#37352f] dark:hover:text-[#e0e0e0]'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5 shrink-0" />
              <span>Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRIORITY FOCUS PILLS (Clean, harmonious in both Light and Dark modes) */}
      <div className="flex items-center gap-2 overflow-x-auto py-0.5 text-xs select-none">
        <span className="text-[#8e8b86] dark:text-[#8a8a8a] font-medium text-[11px] uppercase tracking-wider shrink-0 mr-1">
          Priority Focus:
        </span>

        {/* All Priorities Button */}
        <button
          onClick={() => setPriorityFilter('all')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all whitespace-nowrap ${
            priorityFilter === 'all'
              ? 'bg-white dark:bg-[#262626] text-[#37352f] dark:text-[#f0f0f0] border-[#b4b2ac] dark:border-[#525252] shadow-2xs font-semibold'
              : 'bg-[#f5f4f2] dark:bg-[#1e1e1e] text-[#787774] dark:text-[#9b9b9b] border-[#e5e4e0] dark:border-[#2e2e2e] hover:text-[#37352f] dark:hover:text-[#e0e0e0]'
          }`}
        >
          <span>All Levels</span>
          <span className="text-[11px] opacity-70">{countsByPriority.all}</span>
        </button>

        {/* Urgent Badge */}
        <button
          onClick={() => setPriorityFilter(priorityFilter === 'urgent' ? 'all' : 'urgent')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all whitespace-nowrap ${
            priorityFilter === 'urgent'
              ? 'bg-[#faebeb] text-[#9c3434] border-[#d67a7a] dark:bg-[#361e1e] dark:text-[#f5a3a3] dark:border-[#8c4646] font-semibold shadow-2xs'
              : 'bg-[#faebeb]/80 text-[#9c3434] border-[#f4cccc] dark:bg-[#261717] dark:text-[#e08b8b] dark:border-[#3d2323] hover:opacity-95'
          }`}
        >
          <Flame className="w-3 h-3 shrink-0 opacity-85" />
          <span>Urgent</span>
          <span className="text-[10px] px-1.5 rounded bg-[#f2d5d5] dark:bg-[#422525] text-[#822727] dark:text-[#f5b5b5] font-semibold">
            {countsByPriority.urgent}
          </span>
        </button>

        {/* High Badge */}
        <button
          onClick={() => setPriorityFilter(priorityFilter === 'high' ? 'all' : 'high')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all whitespace-nowrap ${
            priorityFilter === 'high'
              ? 'bg-[#faf0e8] text-[#944e1c] border-[#de9366] dark:bg-[#332218] dark:text-[#f2b68a] dark:border-[#875637] font-semibold shadow-2xs'
              : 'bg-[#faf0e8]/80 text-[#944e1c] border-[#f1dac9] dark:bg-[#241812] dark:text-[#de9f73] dark:border-[#3b271c] hover:opacity-95'
          }`}
        >
          <ArrowUp className="w-3 h-3 shrink-0 opacity-85" />
          <span>High</span>
          <span className="text-[10px] px-1.5 rounded bg-[#f0d9c7] dark:bg-[#3d291e] text-[#783c13] dark:text-[#f5c4a1] font-semibold">
            {countsByPriority.high}
          </span>
        </button>

        {/* Medium Badge */}
        <button
          onClick={() => setPriorityFilter(priorityFilter === 'medium' ? 'all' : 'medium')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all whitespace-nowrap ${
            priorityFilter === 'medium'
              ? 'bg-[#fbf5e5] text-[#7d5d14] border-[#d4b14e] dark:bg-[#302916] dark:text-[#ebd07a] dark:border-[#78652c] font-semibold shadow-2xs'
              : 'bg-[#fbf5e5]/80 text-[#7d5d14] border-[#f0e3bf] dark:bg-[#241f12] dark:text-[#d6ba67] dark:border-[#38301a] hover:opacity-95'
          }`}
        >
          <Minus className="w-3 h-3 shrink-0 opacity-85" />
          <span>Medium</span>
          <span className="text-[10px] px-1.5 rounded bg-[#ede0ba] dark:bg-[#3b331c] text-[#63490f] dark:text-[#f0d98d] font-semibold">
            {countsByPriority.medium}
          </span>
        </button>

        {/* Low Badge */}
        <button
          onClick={() => setPriorityFilter(priorityFilter === 'low' ? 'all' : 'low')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all whitespace-nowrap ${
            priorityFilter === 'low'
              ? 'bg-[#f2f1ef] text-[#5e5c59] border-[#a3a099] dark:bg-[#2c2c2a] dark:text-[#d9d7d2] dark:border-[#5e5d59] font-semibold shadow-2xs'
              : 'bg-[#f2f1ef]/80 text-[#5e5c59] border-[#e0deda] dark:bg-[#212120] dark:text-[#b5b3ae] dark:border-[#333230] hover:opacity-95'
          }`}
        >
          <ArrowDown className="w-3 h-3 shrink-0 opacity-85" />
          <span>Low</span>
          <span className="text-[10px] px-1.5 rounded bg-[#e2e0dc] dark:bg-[#333330] text-[#454341] dark:text-[#d4d2ce] font-semibold">
            {countsByPriority.low}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Search input */}
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="flex items-center w-full px-3 py-1.5 bg-white dark:bg-[#1e1e1e] border border-[#e2e1dc] dark:border-[#333333] rounded-lg text-[#37352f] dark:text-[#e0e0e0] focus-within:border-[#a8a6a0] dark:focus-within:border-[#555555]">
            <Search className="w-3.5 h-3.5 text-[#9c9a95] mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search assignments, courses, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent focus:outline-none placeholder-[#9c9a95] text-xs"
            />
          </div>
        </div>

        {/* Right: Filter Chips & Sort */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source Filter Dropdown */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-2.5 py-1.5 border border-[#e2e1dc] dark:border-[#333333] rounded-lg bg-white dark:bg-[#1e1e1e] text-[#474542] dark:text-[#d4d4d4] focus:outline-none cursor-pointer"
          >
            <option value="all">All Sources</option>
            <option value="moodle">Moodle</option>
            <option value="classroom">Google Classroom</option>
            <option value="notion">Notion</option>
            <option value="trello">Trello</option>
            <option value="personal">Personal</option>
          </select>

          {/* Status Filter */}
          <div className="flex items-center rounded-lg border border-[#e2e1dc] dark:border-[#333333] p-0.5 bg-[#f5f4f1] dark:bg-[#1e1e1e]">
            {(['all', 'pending', 'today', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors whitespace-nowrap ${
                  statusFilter === s
                    ? 'bg-white dark:bg-[#2c2c2c] font-semibold shadow-2xs text-[#37352f] dark:text-[#f0f0f0]'
                    : 'text-[#787774] dark:text-[#999999] hover:text-[#37352f] dark:hover:text-[#e0e0e0]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <div className="flex items-center border border-[#e2e1dc] dark:border-[#333333] rounded-lg px-2.5 py-1.5 bg-white dark:bg-[#1e1e1e] text-[#605e5a] dark:text-[#c7c7c7] gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'due' | 'priority' | 'title')}
              className="bg-transparent focus:outline-none cursor-pointer dark:bg-[#1e1e1e]"
            >
              <option value="priority">Priority First</option>
              <option value="due">Earliest Due</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notion-Style Quick Add Line */}
      <form
        onSubmit={handleQuickAddSubmit}
        className="flex items-center gap-2 p-2 bg-[#fbfbfa] dark:bg-[#1c1c1c] rounded-lg border border-[#e5e4e0] dark:border-[#2e2e2e] focus-within:border-[#b4b2ac] dark:focus-within:border-[#4a4a4a] transition-colors text-xs flex-wrap sm:flex-nowrap"
      >
        <Plus className="w-4 h-4 text-[#9c9a95] shrink-0 ml-1" />
        <input
          type="text"
          value={quickInputTitle}
          onChange={(e) => setQuickInputTitle(e.target.value)}
          placeholder="Quick add a task or deadline and press Enter..."
          className="flex-1 min-w-[160px] bg-transparent focus:outline-none placeholder-[#9c9a95] text-[#37352f] dark:text-[#e6e6e6]"
        />

        {/* Priority dropdown in quick add (no giant emojis) */}
        <select
          value={quickInputPriority}
          onChange={(e) => setQuickInputPriority(e.target.value as TaskPriority)}
          className="bg-white dark:bg-[#262626] border border-[#e2e1dc] dark:border-[#383838] rounded-md px-2.5 py-1 text-[#474542] dark:text-[#d4d4d4] focus:outline-none cursor-pointer"
        >
          <option value="urgent">Priority: Urgent</option>
          <option value="high">Priority: High</option>
          <option value="medium">Priority: Medium</option>
          <option value="low">Priority: Low</option>
        </select>

        {/* Source selector */}
        <select
          value={quickInputSource}
          onChange={(e) => setQuickInputSource(e.target.value as TaskSource)}
          className="bg-white dark:bg-[#262626] border border-[#e2e1dc] dark:border-[#383838] rounded-md px-2.5 py-1 text-[#474542] dark:text-[#d4d4d4] focus:outline-none cursor-pointer"
        >
          <option value="personal">Personal</option>
          <option value="moodle">Moodle</option>
          <option value="classroom">Classroom</option>
          <option value="notion">Notion</option>
          <option value="trello">Trello</option>
        </select>

        <button
          type="submit"
          disabled={!quickInputTitle.trim()}
          className="px-3.5 py-1 bg-[#37352f] hover:bg-[#272623] dark:bg-[#e6e6e6] dark:hover:bg-white text-white dark:text-[#191919] rounded-md font-medium disabled:opacity-40 transition-opacity whitespace-nowrap"
        >
          Add
        </button>
      </form>

      {/* VIEW TYPE 1: NOTION DATABASE TABLE */}
      {viewType === 'table' && (
        <div className="border border-[#e5e4e0] dark:border-[#2a2a2a] rounded-xl overflow-hidden bg-white dark:bg-[#191919] shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e8e7e3] dark:border-[#2a2a2a] bg-[#fbfbfa] dark:bg-[#202020] text-[#787774] dark:text-[#999999] select-none">
                  <th className="py-2.5 px-3 w-10 text-center font-medium"></th>
                  <th className="py-2.5 px-3 font-medium min-w-[280px]">Task / Assignment Title</th>
                  <th className="py-2.5 px-3 font-medium w-[110px] whitespace-nowrap">Priority</th>
                  <th className="py-2.5 px-3 font-medium w-[160px] whitespace-nowrap">Platform / Course</th>
                  <th className="py-2.5 px-3 font-medium w-[170px] whitespace-nowrap">Due Date & Time</th>
                  <th className="py-2.5 px-3 font-medium w-[110px] whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right w-14 whitespace-nowrap">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ecebe7] dark:divide-[#262626]">
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#9c9a95]">
                      No matching tasks found for the selected priority or filter.
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((task) => {
                    const isDone = task.status === 'completed';
                    const dueTime = new Date(task.dueDate).getTime();
                    const diffMins = Math.round((dueTime - Date.now()) / (1000 * 60));
                    const isOverdue = diffMins < 0 && !isDone;
                    const isDueToday = diffMins >= 0 && diffMins <= 1440 && !isDone;

                    return (
                      <tr
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className={`group cursor-pointer hover:bg-[#f9f8f6] dark:hover:bg-[#222222] transition-colors ${getPriorityLeftBorder(
                          task.priority
                        )} ${isDone ? 'opacity-50 bg-[#faf9f7]/60 dark:bg-[#161616]' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3 text-center" onClick={(e) => handleToggleTaskStatus(task, e)}>
                          <button
                            type="button"
                            className="p-0.5 text-[#9c9a95] hover:text-[#37352f] dark:hover:text-neutral-200 transition-colors flex items-center justify-center mx-auto"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-[#2d5c41] dark:text-[#7eb897]" />
                            ) : (
                              <Circle className="w-4 h-4 text-[#c4c2be] dark:text-[#555555] hover:text-[#787774]" />
                            )}
                          </button>
                        </td>

                        {/* Title */}
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-between gap-3">
                            <span
                              className={`font-medium leading-snug ${
                                isDone
                                  ? 'line-through text-[#9c9a95] dark:text-[#666666]'
                                  : 'text-[#37352f] dark:text-[#ececec]'
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.checklist && task.checklist.length > 0 && (
                              <span className="text-[10px] text-[#787774] dark:text-[#999999] bg-[#f1f1ef] dark:bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#e5e4e0] dark:border-[#383838] font-mono shrink-0">
                                {task.checklist.filter((c) => c.done).length}/{task.checklist.length}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Priority Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <PriorityBadge
                            priority={task.priority}
                            size="sm"
                            interactive={true}
                            onClick={(e) => handleCyclePriority(task, e)}
                          />
                        </td>

                        {/* Platform / Course Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <SourceBadge
                            source={task.source}
                            courseName={task.courseName}
                            courseCode={task.courseCode}
                            size="sm"
                          />
                        </td>

                        {/* Due Date (Single line nowrap) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 text-[#9c9a95] shrink-0" />
                            <span
                              className={`font-mono text-xs whitespace-nowrap ${
                                isOverdue
                                  ? 'text-[#9c3434] dark:text-[#f29b9b] font-semibold'
                                  : isDueToday
                                  ? 'text-[#8a4e1d] dark:text-[#f0b58a] font-medium'
                                  : 'text-[#605e5a] dark:text-[#a8a8a8]'
                              }`}
                            >
                              {formatDueDateDisplay(task.dueDate)}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] bg-[#faebeb] text-[#9c3434] border border-[#f4cccc] dark:bg-[#2b1919] dark:text-[#f29b9b] dark:border-[#482828] px-1.5 py-0.2 rounded font-semibold whitespace-nowrap">
                                Late
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status (Single line nowrap) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap ${getStatusBadgeStyle(
                              task.status
                            )}`}
                          >
                            {getStatusLabel(task.status)}
                          </span>
                        </td>

                        {/* External link */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {task.externalUrl ? (
                            <a
                              href={task.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 inline-flex text-[#9c9a95] hover:text-[#37352f] dark:hover:text-[#ececec] transition-colors"
                              title="Open original assignment"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-[#dedcd7] dark:text-[#444444]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW TYPE 2: GROUPED BY PRIORITY */}
      {viewType === 'by-priority' && (
        <div className="space-y-5">
          {priorityGroups.map((group) => {
            const groupTasks = sortedTasks.filter((t) => t.priority === group.key);
            if (groupTasks.length === 0 && priorityFilter !== 'all') return null;

            const Icon = group.icon;

            return (
              <div
                key={group.key}
                className="border border-[#e5e4e0] dark:border-[#2a2a2a] rounded-xl overflow-hidden bg-white dark:bg-[#191919]"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#fbfbfa] dark:bg-[#202020] border-b border-[#e8e7e3] dark:border-[#2a2a2a]">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded-md border text-xs font-semibold inline-flex items-center gap-1.5 ${group.bg}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{group.label}</span>
                    </span>
                    <span className="text-xs text-[#787774] dark:text-[#999999] hidden sm:inline">
                      — {group.desc}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#787774] dark:text-[#999999] font-medium whitespace-nowrap">
                    {groupTasks.length} task{groupTasks.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="divide-y divide-[#ecebe7] dark:divide-[#262626] text-xs">
                  {groupTasks.length === 0 ? (
                    <div className="p-4 text-center text-[#9c9a95]">
                      No tasks assigned to {group.label}.
                    </div>
                  ) : (
                    groupTasks.map((task) => {
                      const isDone = task.status === 'completed';
                      return (
                        <div
                          key={task.id}
                          onClick={() => onSelectTask(task)}
                          className={`flex items-center justify-between gap-4 p-3 hover:bg-[#f9f8f6] dark:hover:bg-[#222222] cursor-pointer transition-colors ${getPriorityLeftBorder(
                            task.priority
                          )}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              onClick={(e) => handleToggleTaskStatus(task, e)}
                              className="text-[#9c9a95] hover:text-[#37352f] shrink-0"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-[#2d5c41] dark:text-[#7eb897]" />
                              ) : (
                                <Circle className="w-4 h-4 text-[#c4c2be] dark:text-[#555555]" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <div
                                className={`font-medium truncate ${
                                  isDone ? 'line-through text-[#9c9a95]' : 'text-[#37352f] dark:text-[#ececec]'
                                }`}
                              >
                                {task.title}
                              </div>
                              {task.courseName && (
                                <div className="text-[11px] text-[#787774] dark:text-[#999999] truncate">
                                  {task.courseName} {task.moduleName ? `• ${task.moduleName}` : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <SourceBadge
                              source={task.source}
                              courseName={task.courseName}
                              courseCode={task.courseCode}
                              size="sm"
                            />
                            <span className="font-mono text-[#787774] dark:text-[#a0a0a0] text-xs whitespace-nowrap">
                              {formatDueDateDisplay(task.dueDate)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW TYPE 3: GROUPED BY SOURCE */}
      {viewType === 'by-source' && (
        <div className="space-y-5">
          {sourceGroups.map((group) => {
            const groupTasks = sortedTasks.filter((t) => t.source === group.key);
            if (groupTasks.length === 0 && selectedSource !== 'all') return null;

            return (
              <div
                key={group.key}
                className="border border-[#e5e4e0] dark:border-[#2a2a2a] rounded-xl overflow-hidden bg-white dark:bg-[#191919]"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#fbfbfa] dark:bg-[#202020] border-b border-[#e8e7e3] dark:border-[#2a2a2a]">
                  <div className="flex items-center gap-2">
                    <SourceBadge source={group.key} showCourse={false} size="sm" />
                    <span className="font-semibold text-[#37352f] dark:text-[#ececec] text-xs">
                      {group.label}
                    </span>
                    <span className="text-[11px] text-[#787774]">({groupTasks.length})</span>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="divide-y divide-[#ecebe7] dark:divide-[#262626] text-xs">
                  {groupTasks.length === 0 ? (
                    <div className="p-4 text-center text-[#9c9a95]">
                      No active tasks from {group.label}.
                    </div>
                  ) : (
                    groupTasks.map((task) => {
                      const isDone = task.status === 'completed';
                      return (
                        <div
                          key={task.id}
                          onClick={() => onSelectTask(task)}
                          className="flex items-center justify-between gap-4 p-3 hover:bg-[#f9f8f6] dark:hover:bg-[#222222] cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              onClick={(e) => handleToggleTaskStatus(task, e)}
                              className="text-[#9c9a95] hover:text-[#37352f] shrink-0"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-[#2d5c41] dark:text-[#7eb897]" />
                              ) : (
                                <Circle className="w-4 h-4 text-[#c4c2be] dark:text-[#555555]" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <div
                                className={`font-medium truncate ${
                                  isDone ? 'line-through text-[#9c9a95]' : 'text-[#37352f] dark:text-[#ececec]'
                                }`}
                              >
                                {task.title}
                              </div>
                              {task.courseName && (
                                <div className="text-[11px] text-[#787774] dark:text-[#999999] truncate">
                                  {task.courseName} {task.moduleName ? `• ${task.moduleName}` : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-[#787774] dark:text-[#a0a0a0] text-xs whitespace-nowrap">
                              {formatDueDateDisplay(task.dueDate)}
                            </span>
                            <PriorityBadge priority={task.priority} size="sm" />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW TYPE 4: KANBAN BOARD */}
      {viewType === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanColumns.map((col) => {
            const colTasks = sortedTasks.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                className="bg-[#faf9f7] dark:bg-[#191919] rounded-xl border border-[#e5e4e0] dark:border-[#2a2a2a] p-3 flex flex-col min-h-[500px]"
              >
                {/* Column header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#e8e7e3] dark:border-[#2a2a2a] text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        col.status === 'completed'
                          ? 'bg-[#7eb897]'
                          : col.status === 'in_progress'
                          ? 'bg-[#85b7d6]'
                          : 'bg-[#c4c2be]'
                      }`}
                    />
                    <span className="font-semibold text-[#37352f] dark:text-[#ececec]">
                      {col.label}
                    </span>
                    <span className="text-[#9c9a95] text-[11px]">({colTasks.length})</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-[#9c9a95] text-xs border border-dashed border-[#e2e1dc] dark:border-[#2e2e2e] rounded-lg">
                      No tasks in {col.label}
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className={`p-3 bg-white dark:bg-[#222222] rounded-lg border border-[#e5e4e0] dark:border-[#333333] shadow-2xs hover:border-[#b4b2ac] dark:hover:border-[#555555] cursor-pointer transition-all hover:-translate-y-0.5 space-y-2 text-xs ${getPriorityLeftBorder(
                          task.priority
                        )}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <SourceBadge
                            source={task.source}
                            courseName={task.courseName}
                            courseCode={task.courseCode}
                            size="sm"
                          />
                          <PriorityBadge priority={task.priority} size="sm" />
                        </div>

                        <div className="font-medium text-[#37352f] dark:text-[#ececec] leading-snug">
                          {task.title}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#f1f1ef] dark:border-[#2e2e2e] text-[11px] text-[#787774] dark:text-[#999999] font-mono">
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-[#9c9a95] shrink-0" />
                            <span>{formatDueDateDisplay(task.dueDate)}</span>
                          </div>
                          {task.checklist && task.checklist.length > 0 && (
                            <span className="text-[10px]">
                              {task.checklist.filter((c) => c.done).length}/{task.checklist.length}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
