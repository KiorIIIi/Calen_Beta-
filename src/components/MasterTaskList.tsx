import React, { useState } from 'react';
import { Task, TaskSource, TaskStatus, TaskPriority, TaskListViewType } from '../types';
import { SourceBadge } from './SourceBadge';
import { PriorityBadge } from './PriorityBadge';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  ExternalLink, 
  MoreHorizontal, 
  LayoutList, 
  Columns3, 
  Layers, 
  ChevronRight,
  AlertCircle,
  Tag
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
  onDeleteTask,
}) => {
  const [viewType, setViewType] = useState<TaskListViewType>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [quickInputTitle, setQuickInputTitle] = useState('');
  const [quickInputSource, setQuickInputSource] = useState<TaskSource>('personal');
  const [sortBy, setSortBy] = useState<'due' | 'priority' | 'title'>('due');

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
    if (sortBy === 'due') {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (sortBy === 'priority') {
      const weights: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      return weights[b.priority] - weights[a.priority];
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

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInputTitle.trim()) return;

    // Default due tomorrow at 18:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);

    onAddTask({
      title: quickInputTitle.trim(),
      source: quickInputSource,
      dueDate: tomorrow.toISOString().slice(0, 16),
      status: 'todo',
      priority: 'medium',
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

  // Grouped by source mapping
  const sourceGroups: { key: TaskSource; label: string; count: number }[] = [
    { key: 'classroom', label: 'Google Classroom', count: tasks.filter((t) => t.source === 'classroom').length },
    { key: 'moodle', label: 'Moodle LMS', count: tasks.filter((t) => t.source === 'moodle').length },
    { key: 'notion', label: 'Notion Database', count: tasks.filter((t) => t.source === 'notion').length },
    { key: 'trello', label: 'Trello Board', count: tasks.filter((t) => t.source === 'trello').length },
    { key: 'personal', label: 'Personal & Direct', count: tasks.filter((t) => t.source === 'personal').length },
  ];

  const kanbanColumns: { status: TaskStatus; label: string }[] = [
    { status: 'todo', label: 'To Do' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in">
      {/* Title & Notion-like Database Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-neutral-200/70 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-sans flex items-center gap-2.5">
            <span>Master Task List</span>
            <span className="text-xs font-normal text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
              {tasks.length} total
            </span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Unified student assignments & tasks across Moodle, Google Classroom, Notion, and Trello
          </p>
        </div>

        {/* View Style Switcher (Table / By-Source / Kanban) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs font-medium border border-neutral-200/60 dark:border-neutral-700/60">
            <button
              onClick={() => setViewType('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                viewType === 'table'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
              title="Table view"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>

            <button
              onClick={() => setViewType('by-source')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                viewType === 'by-source'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
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
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
              title="Kanban board"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Search input */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <div className="flex items-center w-full px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-800 dark:text-neutral-200 focus-within:border-neutral-400">
            <Search className="w-3.5 h-3.5 text-neutral-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search assignments, courses, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent focus:outline-none placeholder-neutral-400 text-xs"
            />
          </div>
        </div>

        {/* Right: Filter Chips & Sort */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source Filter Dropdown */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-2.5 py-1.5 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 focus:outline-none"
          >
            <option value="all">All Sources</option>
            <option value="moodle">Moodle</option>
            <option value="classroom">Google Classroom</option>
            <option value="notion">Notion</option>
            <option value="trello">Trello</option>
            <option value="personal">Personal</option>
          </select>

          {/* Status Filter */}
          <div className="flex items-center rounded-lg border border-neutral-200 dark:border-neutral-800 p-0.5 bg-neutral-50 dark:bg-neutral-900">
            {(['all', 'pending', 'today', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 rounded capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-white dark:bg-neutral-800 font-semibold shadow-2xs text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Sort By */}
          <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'due' | 'priority' | 'title')}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="due">Earliest Due</option>
              <option value="priority">Priority</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notion-Style Quick Add Line */}
      <form
        onSubmit={handleQuickAddSubmit}
        className="flex items-center gap-2 p-2 bg-neutral-50/70 dark:bg-neutral-900/40 rounded-lg border border-neutral-200/80 dark:border-neutral-800 focus-within:border-neutral-400 transition-colors text-xs"
      >
        <Plus className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />
        <input
          type="text"
          value={quickInputTitle}
          onChange={(e) => setQuickInputTitle(e.target.value)}
          placeholder="+ Quick add a task or deadline and press Enter..."
          className="flex-1 bg-transparent focus:outline-none placeholder-neutral-400 text-neutral-800 dark:text-neutral-200"
        />
        <select
          value={quickInputSource}
          onChange={(e) => setQuickInputSource(e.target.value as TaskSource)}
          className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-neutral-600 dark:text-neutral-300 focus:outline-none"
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
          className="px-3 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          Add
        </button>
      </form>

      {/* VIEW TYPE 1: NOTION DATABASE TABLE */}
      {viewType === 'table' && (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-[#181818] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 text-neutral-500 select-none">
                  <th className="py-2.5 px-3 w-10 text-center font-medium"></th>
                  <th className="py-2.5 px-3 font-medium min-w-[240px]">Task / Assignment Title</th>
                  <th className="py-2.5 px-3 font-medium min-w-[140px]">Platform / Course</th>
                  <th className="py-2.5 px-3 font-medium min-w-[140px]">Due Date & Time</th>
                  <th className="py-2.5 px-3 font-medium min-w-[80px]">Priority</th>
                  <th className="py-2.5 px-3 font-medium min-w-[90px]">Status</th>
                  <th className="py-2.5 px-3 font-medium text-right w-16">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150 dark:divide-neutral-800/80">
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      No matching tasks found.
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
                        className={`group cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${
                          isDone ? 'opacity-60 bg-neutral-50/30 dark:bg-neutral-900/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3 text-center" onClick={(e) => handleToggleTaskStatus(task, e)}>
                          <button
                            type="button"
                            className="p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50 dark:fill-emerald-950" />
                            ) : (
                              <Circle className="w-4 h-4 text-neutral-300 dark:text-neutral-600 hover:text-neutral-500" />
                            )}
                          </button>
                        </td>

                        {/* Title */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${
                                isDone
                                  ? 'line-through text-neutral-400 dark:text-neutral-500'
                                  : 'text-neutral-900 dark:text-neutral-100'
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.checklist && task.checklist.length > 0 && (
                              <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded font-mono">
                                {task.checklist.filter((c) => c.done).length}/{task.checklist.length}
                              </span>
                            )}
                          </div>
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
                            <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span
                              className={`font-mono text-xs ${
                                isOverdue
                                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                  : isDueToday
                                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                                  : 'text-neutral-600 dark:text-neutral-400'
                              }`}
                            >
                              {formatDueDateDisplay(task.dueDate)}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 px-1 rounded font-semibold">
                                Late
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-3">
                          <PriorityBadge priority={task.priority} size="sm" />
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize border ${
                              task.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : task.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-neutral-100 text-neutral-700 border-neutral-200'
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
                              className="p-1 inline-flex text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                              title="Open original assignment"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-neutral-300 dark:text-neutral-700">-</span>
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

      {/* VIEW TYPE 2: GROUPED BY SOURCE */}
      {viewType === 'by-source' && (
        <div className="space-y-6">
          {sourceGroups.map((group) => {
            const groupTasks = sortedTasks.filter((t) => t.source === group.key);
            if (groupTasks.length === 0 && selectedSource !== 'all') return null;

            return (
              <div
                key={group.key}
                className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-[#181818]"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-neutral-50/80 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <SourceBadge source={group.key} showCourse={false} size="sm" />
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                      {group.label}
                    </span>
                    <span className="text-[11px] text-neutral-400">({groupTasks.length})</span>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="divide-y divide-neutral-150 dark:divide-neutral-800/80 text-xs">
                  {groupTasks.length === 0 ? (
                    <div className="p-4 text-center text-neutral-400">
                      No active tasks from {group.label}.
                    </div>
                  ) : (
                    groupTasks.map((task) => {
                      const isDone = task.status === 'completed';
                      return (
                        <div
                          key={task.id}
                          onClick={() => onSelectTask(task)}
                          className="flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => handleToggleTaskStatus(task, e)}
                              className="text-neutral-400 hover:text-neutral-700"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Circle className="w-4 h-4 text-neutral-300" />
                              )}
                            </button>
                            <div>
                              <div
                                className={`font-medium ${
                                  isDone ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'
                                }`}
                              >
                                {task.title}
                              </div>
                              {task.courseName && (
                                <div className="text-[11px] text-neutral-500">
                                  {task.courseName} {task.moduleName ? `• ${task.moduleName}` : ''}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono text-neutral-500 text-xs">
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

      {/* VIEW TYPE 3: KANBAN BOARD */}
      {viewType === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanColumns.map((col) => {
            const colTasks = sortedTasks.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                className="bg-neutral-50/70 dark:bg-[#171717] rounded-xl border border-neutral-200/80 dark:border-neutral-800 p-3 flex flex-col min-h-[500px]"
              >
                {/* Column header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-neutral-200/80 dark:border-neutral-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        col.status === 'completed'
                          ? 'bg-emerald-500'
                          : col.status === 'in_progress'
                          ? 'bg-blue-500'
                          : 'bg-neutral-400'
                      }`}
                    />
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {col.label}
                    </span>
                    <span className="text-neutral-400 text-[11px]">({colTasks.length})</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-neutral-400 text-xs border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
                      No tasks in {col.label}
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className="p-3 bg-white dark:bg-[#202020] rounded-lg border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs hover:border-neutral-400 dark:hover:border-neutral-600 cursor-pointer transition-all hover:-translate-y-0.5 space-y-2 text-xs"
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

                        <div className="font-medium text-neutral-900 dark:text-neutral-100 leading-snug">
                          {task.title}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 font-mono">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-400" />
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
