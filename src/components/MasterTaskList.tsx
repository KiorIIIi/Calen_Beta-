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
    // Search
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

    // Source filter
    if (selectedSource !== 'all' && task.source !== selectedSource) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    // Status filter
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

  // Priority edge strip color helper for table rows
  const getPriorityLeftBorder = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-3 border-l-[#cf6666] bg-[#faebeb]/15';
      case 'high':
        return 'border-l-3 border-l-[#d67b45] bg-[#faf0e8]/10';
      case 'medium':
        return 'border-l-3 border-l-[#d4b14e] bg-[#fbf5e5]/10';
      case 'low':
      default:
        return 'border-l-3 border-l-transparent';
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
    { key: 'urgent', label: 'Urgent Priority', desc: 'Critical cutoff deadlines & overdue submissions', icon: Flame, bg: 'bg-[#faebeb] text-[#9c3434] border-[#f4cccc]', count: tasks.filter((t) => t.priority === 'urgent').length },
    { key: 'high', label: 'High Priority', desc: 'Upcoming major exams, projects & problem sets', icon: ArrowUp, bg: 'bg-[#faf0e8] text-[#944e1c] border-[#f1dac9]', count: tasks.filter((t) => t.priority === 'high').length },
    { key: 'medium', label: 'Medium Priority', desc: 'Regular homework, readings & ongoing coursework', icon: Minus, bg: 'bg-[#fbf5e5] text-[#7d5d14] border-[#f0e3bf]', count: tasks.filter((t) => t.priority === 'medium').length },
    { key: 'low', label: 'Low Priority', desc: 'Long-term goals, reviews & optional reading', icon: ArrowDown, bg: 'bg-[#f2f1ef] text-[#5e5c59] border-[#e0deda]', count: tasks.filter((t) => t.priority === 'low').length },
  ];

  const kanbanColumns: { status: TaskStatus; label: string }[] = [
    { status: 'todo', label: 'To Do' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in">
      {/* Title & Notion-like Database Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#e8e7e3] dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-neutral-100 font-sans flex items-center gap-2.5">
            <span>Master Task List</span>
            <span className="text-xs font-normal text-[#787774] bg-[#f1f1ef] dark:bg-neutral-800 px-2.5 py-0.5 rounded-full border border-[#e5e4e0] dark:border-neutral-700">
              {tasks.length} total
            </span>
          </h1>
          <p className="text-xs text-[#787774] dark:text-neutral-400 mt-1">
            Unified student assignments & tasks with visual priority badges to focus on what matters first
          </p>
        </div>

        {/* View Style Switcher */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center p-1 bg-[#f1f1ef] dark:bg-neutral-800 rounded-lg text-xs font-medium border border-[#e5e4e0] dark:border-neutral-700/60">
            <button
              onClick={() => setViewType('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                viewType === 'table'
                  ? 'bg-white dark:bg-neutral-900 text-[#37352f] dark:text-neutral-100 shadow-2xs font-semibold'
                  : 'text-[#787774] hover:text-[#37352f] dark:hover:text-neutral-200'
              }`}
              title="Table view"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>

            <button
              onClick={() => setViewType('by-priority')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                viewType === 'by-priority'
                  ? 'bg-white dark:bg-neutral-900 text-[#37352f] dark:text-neutral-100 shadow-2xs font-semibold'
                  : 'text-[#787774] hover:text-[#37352f] dark:hover:text-neutral-200'
              }`}
              title="Grouped by priority level"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">By Priority</span>
            </button>

            <button
              onClick={() => setViewType('by-source')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                viewType === 'by-source'
                  ? 'bg-white dark:bg-neutral-900 text-[#37352f] dark:text-neutral-100 shadow-2xs font-semibold'
                  : 'text-[#787774] hover:text-[#37352f] dark:hover:text-neutral-200'
              }`}
              title="Grouped by platform"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">By Platform</span>
            </button>

            <button
              onClick={() => setViewType('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                viewType === 'kanban'
                  ? 'bg-white dark:bg-neutral-900 text-[#37352f] dark:text-neutral-100 shadow-2xs font-semibold'
                  : 'text-[#787774] hover:text-[#37352f] dark:hover:text-neutral-200'
              }`}
              title="Kanban board"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRIORITY FOCUS PILLS (Subtle colored badges for students) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs select-none">
        <span className="text-[#9c9a95] font-medium text-[11px] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          Priority Focus:
        </span>

        {/* All Priorities Button */}
        <button
          onClick={() => setPriorityFilter('all')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
            priorityFilter === 'all'
              ? 'bg-white dark:bg-neutral-800 text-[#37352f] dark:text-neutral-100 border-[#b4b2ac] shadow-2xs font-semibold'
              : 'bg-[#faf9f7] dark:bg-neutral-900 text-[#787774] border-[#e5e4e0] dark:border-neutral-800 hover:text-[#37352f]'
          }`}
        >
          <span>All Levels</span>
          <span className="text-[10px] text-[#9c9a95]">({countsByPriority.all})</span>
        </button>

        {/* Urgent Badge */}
        <button
          onClick={() => setPriorityFilter(priorityFilter === 'urgent' ? 'all' : 'urgent')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
            priorityFilter === 'urgent'
              ? 'ring-1.5 ring-[#cf6666] bg-[#faebeb] text-[#9c3434] border-[#f4cccc] font-semibold shadow-2xs'
              : 'bg-[#faebeb]/60 text-[#9c3434] border-[#f4cccc]/70 hover:bg-[#faebeb]'
          }`}
        >
          <Flame className="w-3 h-3 text-[#9c3434]" />
          <span>Urgent</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#f4cccc] text-[#7d2222] font-semibold">
            {countsByPriority.urgent}
          </span>
        </button>

        {/* High Badge */}
        <button
          onClick={() => setPriorityFilter(priorityFilter === 'high' ? 'all' : 'high')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
            priorityFilter === 'high'
              ? 'ring-1.5 ring-[#d67b45] bg-[#faf0e8] text-[#944e1c] border-[#f1dac9] font-semibold shadow-2xs'
              : 'bg-[#faf0e8]/60 text-[#944e1c] border-[#f1dac9]/70 hover:bg-[#faf0e8]'
          }`}
        >
          <ArrowUp className="w-3 h-3 text-[#944e1c]" />
          <span>High</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#f1dac9] text-[#783c13] font-semibold">
            {countsByPriority.high}
          </span>
        </button>

        {/* Medium Badge */}
        <button
          onClick={() => setPriorityFilter(priorityFilter === 'medium' ? 'all' : 'medium')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
            priorityFilter === 'medium'
              ? 'ring-1.5 ring-[#d4b14e] bg-[#fbf5e5] text-[#7d5d14] border-[#f0e3bf] font-semibold shadow-2xs'
              : 'bg-[#fbf5e5]/60 text-[#7d5d14] border-[#f0e3bf]/70 hover:bg-[#fbf5e5]'
          }`}
        >
          <Minus className="w-3 h-3 text-[#7d5d14]" />
          <span>Medium</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#f0e3bf] text-[#63490f] font-semibold">
            {countsByPriority.medium}
          </span>
        </button>

        {/* Low Badge */}
        <button
          onClick={() => setPriorityFilter(priorityFilter === 'low' ? 'all' : 'low')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
            priorityFilter === 'low'
              ? 'ring-1.5 ring-[#a3a099] bg-[#f2f1ef] text-[#5e5c59] border-[#e0deda] font-semibold shadow-2xs'
              : 'bg-[#f2f1ef]/60 text-[#5e5c59] border-[#e0deda]/70 hover:bg-[#f2f1ef]'
          }`}
        >
          <ArrowDown className="w-3 h-3 text-[#5e5c59]" />
          <span>Low</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#e0deda] text-[#454341] font-semibold">
            {countsByPriority.low}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Search input */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="flex items-center w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-[#e2e1dc] dark:border-neutral-800 rounded-lg text-[#37352f] dark:text-neutral-200 focus-within:border-[#b4b2ac]">
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
            className="px-2.5 py-1.5 border border-[#e2e1dc] dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-[#474542] dark:text-neutral-300 focus:outline-none"
          >
            <option value="all">All Sources</option>
            <option value="moodle">Moodle</option>
            <option value="classroom">Google Classroom</option>
            <option value="notion">Notion</option>
            <option value="trello">Trello</option>
            <option value="personal">Personal</option>
          </select>

          {/* Status Filter */}
          <div className="flex items-center rounded-lg border border-[#e2e1dc] dark:border-neutral-800 p-0.5 bg-[#fbfbfa] dark:bg-neutral-900">
            {(['all', 'pending', 'today', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 rounded capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-white dark:bg-neutral-800 font-semibold shadow-2xs text-[#37352f] dark:text-neutral-100'
                    : 'text-[#787774] hover:text-[#37352f] dark:hover:text-neutral-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <div className="flex items-center border border-[#e2e1dc] dark:border-neutral-800 rounded-lg px-2.5 py-1.5 bg-white dark:bg-neutral-900 text-[#605e5a] dark:text-neutral-400 gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'due' | 'priority' | 'title')}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="priority">Priority First</option>
              <option value="due">Earliest Due</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notion-Style Quick Add Line with Priority Selector */}
      <form
        onSubmit={handleQuickAddSubmit}
        className="flex items-center gap-2 p-2 bg-[#fbfbfa] dark:bg-neutral-900/40 rounded-lg border border-[#e5e4e0] dark:border-neutral-800 focus-within:border-[#b4b2ac] transition-colors text-xs flex-wrap sm:flex-nowrap"
      >
        <Plus className="w-4 h-4 text-[#9c9a95] shrink-0 ml-1" />
        <input
          type="text"
          value={quickInputTitle}
          onChange={(e) => setQuickInputTitle(e.target.value)}
          placeholder="+ Quick add a task or deadline and press Enter..."
          className="flex-1 min-w-[150px] bg-transparent focus:outline-none placeholder-[#9c9a95] text-[#37352f] dark:text-neutral-200"
        />

        {/* Priority dropdown in quick add */}
        <select
          value={quickInputPriority}
          onChange={(e) => setQuickInputPriority(e.target.value as TaskPriority)}
          className="bg-white dark:bg-neutral-800 border border-[#e2e1dc] dark:border-neutral-700 rounded px-2 py-1 text-[#474542] dark:text-neutral-300 focus:outline-none"
        >
          <option value="urgent">🔴 Urgent</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">⚪ Low</option>
        </select>

        {/* Source selector */}
        <select
          value={quickInputSource}
          onChange={(e) => setQuickInputSource(e.target.value as TaskSource)}
          className="bg-white dark:bg-neutral-800 border border-[#e2e1dc] dark:border-neutral-700 rounded px-2 py-1 text-[#474542] dark:text-neutral-300 focus:outline-none"
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
          className="px-3 py-1 bg-[#37352f] hover:bg-[#272623] dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 rounded font-medium disabled:opacity-40 transition-opacity"
        >
          Add
        </button>
      </form>

      {/* VIEW TYPE 1: NOTION DATABASE TABLE WITH PRIORITY INDICATORS */}
      {viewType === 'table' && (
        <div className="border border-[#e5e4e0] dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-[#181818] shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e8e7e3] dark:border-neutral-800 bg-[#fbfbfa] dark:bg-neutral-900/60 text-[#787774] select-none">
                  <th className="py-2.5 px-3 w-10 text-center font-medium"></th>
                  <th className="py-2.5 px-3 font-medium min-w-[240px]">Task / Assignment Title</th>
                  <th className="py-2.5 px-3 font-medium min-w-[130px]">Priority</th>
                  <th className="py-2.5 px-3 font-medium min-w-[140px]">Platform / Course</th>
                  <th className="py-2.5 px-3 font-medium min-w-[140px]">Due Date & Time</th>
                  <th className="py-2.5 px-3 font-medium min-w-[90px]">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right w-16">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ecebe7] dark:divide-neutral-800/80">
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
                        className={`group cursor-pointer hover:bg-[#fbfbfa] dark:hover:bg-neutral-800/40 transition-colors ${getPriorityLeftBorder(
                          task.priority
                        )} ${isDone ? 'opacity-55 bg-[#faf9f7] dark:bg-neutral-900/20' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3 text-center" onClick={(e) => handleToggleTaskStatus(task, e)}>
                          <button
                            type="button"
                            className="p-0.5 text-[#9c9a95] hover:text-[#37352f] dark:hover:text-neutral-200 transition-colors"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-[#2d5c41] fill-[#eef4ee] dark:fill-[#1a2920]" />
                            ) : (
                              <Circle className="w-4 h-4 text-[#c4c2be] dark:text-neutral-600 hover:text-[#787774]" />
                            )}
                          </button>
                        </td>

                        {/* Title */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${
                                isDone
                                  ? 'line-through text-[#9c9a95] dark:text-neutral-500'
                                  : 'text-[#37352f] dark:text-neutral-100'
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.checklist && task.checklist.length > 0 && (
                              <span className="text-[10px] text-[#787774] bg-[#f1f1ef] dark:bg-neutral-800 px-1.5 py-0.2 rounded font-mono">
                                {task.checklist.filter((c) => c.done).length}/{task.checklist.length}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Priority Badge with Interactive Click-to-Cycle */}
                        <td className="py-3 px-3">
                          <PriorityBadge
                            priority={task.priority}
                            size="sm"
                            interactive={true}
                            onClick={(e) => handleCyclePriority(task, e)}
                          />
                        </td>

                        {/* Platform / Course Badge */}
                        <td className="py-3 px-3">
                          <SourceBadge
                            source={task.source}
                            courseName={task.courseName}
                            courseCode={task.courseCode}
                            size="sm"
                          />
                        </td>

                        {/* Due Date */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#9c9a95] shrink-0" />
                            <span
                              className={`font-mono text-xs ${
                                isOverdue
                                  ? 'text-[#9c3434] dark:text-[#f29b9b] font-semibold'
                                  : isDueToday
                                  ? 'text-[#8a4e1d] dark:text-[#f0b58a] font-medium'
                                  : 'text-[#605e5a] dark:text-neutral-400'
                              }`}
                            >
                              {formatDueDateDisplay(task.dueDate)}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] bg-[#faebeb] text-[#9c3434] border border-[#f4cccc] dark:bg-[#2b1919] dark:text-[#f29b9b] dark:border-[#482828] px-1 rounded font-semibold">
                                Late
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium capitalize border ${
                              task.status === 'completed'
                                ? 'bg-[#eef4ee] text-[#2d5c41] border-[#d7e5d6]'
                                : task.status === 'in_progress'
                                ? 'bg-[#edf4f9] text-[#275c7d] border-[#d0e2ee]'
                                : 'bg-[#f2f1ef] text-[#5e5c59] border-[#e0deda]'
                            }`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* External link */}
                        <td className="py-3 px-3 text-right">
                          {task.externalUrl ? (
                            <a
                              href={task.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 inline-flex text-[#9c9a95] hover:text-[#37352f] dark:hover:text-neutral-200 transition-colors"
                              title="Open original assignment"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-[#dedcd7] dark:text-neutral-700">-</span>
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

      {/* VIEW TYPE 2: GROUPED BY PRIORITY (Focus view for students) */}
      {viewType === 'by-priority' && (
        <div className="space-y-6">
          {priorityGroups.map((group) => {
            const groupTasks = sortedTasks.filter((t) => t.priority === group.key);
            if (groupTasks.length === 0 && priorityFilter !== 'all') return null;

            const Icon = group.icon;

            return (
              <div
                key={group.key}
                className="border border-[#e5e4e0] dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-[#181818]"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#fbfbfa] dark:bg-neutral-900/60 border-b border-[#e8e7e3] dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <span className={`p-1 rounded-md border text-xs font-semibold flex items-center gap-1 ${group.bg}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{group.label}</span>
                    </span>
                    <span className="text-xs text-[#787774] hidden sm:inline">
                      — {group.desc}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#787774] font-medium">
                    {groupTasks.length} task{groupTasks.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="divide-y divide-[#ecebe7] dark:divide-neutral-800/80 text-xs">
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
                          className={`flex items-center justify-between p-3 hover:bg-[#fbfbfa] dark:hover:bg-neutral-800/40 cursor-pointer transition-colors ${getPriorityLeftBorder(
                            task.priority
                          )}`}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => handleToggleTaskStatus(task, e)}
                              className="text-[#9c9a95] hover:text-[#37352f]"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-[#2d5c41]" />
                              ) : (
                                <Circle className="w-4 h-4 text-[#c4c2be]" />
                              )}
                            </button>
                            <div>
                              <div
                                className={`font-medium ${
                                  isDone ? 'line-through text-[#9c9a95]' : 'text-[#37352f] dark:text-neutral-100'
                                }`}
                              >
                                {task.title}
                              </div>
                              {task.courseName && (
                                <div className="text-[11px] text-[#787774]">
                                  {task.courseName} {task.moduleName ? `• ${task.moduleName}` : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <SourceBadge
                              source={task.source}
                              courseName={task.courseName}
                              courseCode={task.courseCode}
                              size="sm"
                            />
                            <span className="font-mono text-[#787774] text-xs">
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
        <div className="space-y-6">
          {sourceGroups.map((group) => {
            const groupTasks = sortedTasks.filter((t) => t.source === group.key);
            if (groupTasks.length === 0 && selectedSource !== 'all') return null;

            return (
              <div
                key={group.key}
                className="border border-[#e5e4e0] dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-[#181818]"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#fbfbfa] dark:bg-neutral-900/60 border-b border-[#e8e7e3] dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <SourceBadge source={group.key} showCourse={false} size="sm" />
                    <span className="font-semibold text-[#37352f] dark:text-neutral-200 text-xs">
                      {group.label}
                    </span>
                    <span className="text-[11px] text-[#787774]">({groupTasks.length})</span>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="divide-y divide-[#ecebe7] dark:divide-neutral-800/80 text-xs">
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
                          className="flex items-center justify-between p-3 hover:bg-[#fbfbfa] dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => handleToggleTaskStatus(task, e)}
                              className="text-[#9c9a95] hover:text-[#37352f]"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-[#2d5c41]" />
                              ) : (
                                <Circle className="w-4 h-4 text-[#c4c2be]" />
                              )}
                            </button>
                            <div>
                              <div
                                className={`font-medium ${
                                  isDone ? 'line-through text-[#9c9a95]' : 'text-[#37352f] dark:text-neutral-100'
                                }`}
                              >
                                {task.title}
                              </div>
                              {task.courseName && (
                                <div className="text-[11px] text-[#787774]">
                                  {task.courseName} {task.moduleName ? `• ${task.moduleName}` : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[#787774] text-xs">
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
                className="bg-[#faf9f7] dark:bg-[#171717] rounded-xl border border-[#e5e4e0] dark:border-neutral-800 p-3 flex flex-col min-h-[500px]"
              >
                {/* Column header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#e8e7e3] dark:border-neutral-800 text-xs">
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
                    <span className="font-semibold text-[#37352f] dark:text-neutral-200">
                      {col.label}
                    </span>
                    <span className="text-[#9c9a95] text-[11px]">({colTasks.length})</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-[#9c9a95] text-xs border border-dashed border-[#e2e1dc] dark:border-neutral-800 rounded-lg">
                      No tasks in {col.label}
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className={`p-3 bg-white dark:bg-[#202020] rounded-lg border border-[#e5e4e0] dark:border-neutral-700/80 shadow-2xs hover:border-[#b4b2ac] dark:hover:border-neutral-600 cursor-pointer transition-all hover:-translate-y-0.5 space-y-2 text-xs ${getPriorityLeftBorder(
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

                        <div className="font-medium text-[#37352f] dark:text-neutral-100 leading-snug">
                          {task.title}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#f1f1ef] dark:border-neutral-800 text-[11px] text-[#787774] font-mono">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#9c9a95]" />
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
