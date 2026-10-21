import React, { useState } from 'react';
import { Task, CalendarViewType, TaskSource } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
} from 'lucide-react';

interface Props {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onAddTaskOnDate: (dateIso: string) => void;
}

export const CalendarView: React.FC<Props> = ({
  tasks,
  onSelectTask,
  onAddTaskOnDate,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewType>('month');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (sourceFilter !== 'all' && t.source !== sourceFilter) return false;
    return true;
  });

  // Calendar Navigation
  const prevPeriod = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const nextPeriod = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const jumpToToday = () => {
    setCurrentDate(new Date());
  };

  // Month Grid Calculation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();
  const calendarCells: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    calendarCells.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete grid (42 cells: 6 rows of 7)
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  // Week Grid Calculation (for week view)
  const currentDayOfWeek = currentDate.getDay();
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDayOfWeek);
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push(d);
  }

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const getTasksForDate = (date: Date): Task[] => {
    const dateStr = date.toISOString().slice(0, 10);
    return filteredTasks.filter((t) => t.dueDate.startsWith(dateStr));
  };

  // Soft and pastel Notion palette
  const getSourceColor = (source: TaskSource) => {
    switch (source) {
      case 'classroom':
        return 'bg-[#edf4ed] text-[#2c5b40] border-[#d4e6d3] dark:bg-[#1a271f] dark:text-[#a0d2b3] dark:border-[#273d2f]';
      case 'moodle':
        return 'bg-[#faf1e8] text-[#8c4c1a] border-[#f1dccb] dark:bg-[#281c15] dark:text-[#edb187] dark:border-[#422e20]';
      case 'notion':
        return 'bg-[#f3f2ef] text-[#474542] border-[#dedcd7] dark:bg-[#232322] dark:text-[#d4d1cb] dark:border-[#383735]';
      case 'trello':
        return 'bg-[#edf4f9] text-[#255a7b] border-[#d2e4f0] dark:bg-[#182631] dark:text-[#9bcbe6] dark:border-[#263c4d]';
      case 'personal':
      default:
        return 'bg-[#f5f1f8] text-[#593b74] border-[#ded4e9] dark:bg-[#231b2b] dark:text-[#cbaee6] dark:border-[#3f304a]';
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const today = new Date();

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e8e7e3] dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-neutral-100 font-sans flex items-center gap-2">
            <span>{monthNames[month]} {year}</span>
          </h1>
          <p className="text-xs text-[#787774] dark:text-neutral-400 mt-1">
            Visual assignment calendar with real-time course deadline milestones
          </p>
        </div>

        {/* Navigation & View Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2.5 py-1 text-xs border border-[#e2e1dc] dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-[#474542] dark:text-neutral-300 focus:outline-none"
          >
            <option value="all">All Integrations</option>
            <option value="moodle">Moodle Assignments</option>
            <option value="classroom">Google Classroom</option>
            <option value="notion">Notion</option>
            <option value="trello">Trello</option>
            <option value="personal">Personal</option>
          </select>

          {/* Month / Week Switch */}
          <div className="flex items-center p-0.5 bg-[#f1f1ef] dark:bg-neutral-800/80 rounded-lg text-xs font-medium border border-[#e5e4e0] dark:border-neutral-700/60">
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-neutral-900 text-[#37352f] dark:text-neutral-100 shadow-2xs font-semibold'
                  : 'text-[#787774] hover:text-[#37352f] dark:hover:text-neutral-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-neutral-900 text-[#37352f] dark:text-neutral-100 shadow-2xs font-semibold'
                  : 'text-[#787774] hover:text-[#37352f] dark:hover:text-neutral-200'
              }`}
            >
              Week
            </button>
          </div>

          {/* Nav arrows & Today button */}
          <div className="flex items-center gap-1 border border-[#e2e1dc] dark:border-neutral-800 rounded-lg p-0.5 bg-white dark:bg-neutral-900">
            <button
              onClick={prevPeriod}
              className="p-1 text-[#787774] hover:text-[#37352f] dark:hover:text-neutral-100 rounded hover:bg-[#f1f1ef] dark:hover:bg-neutral-800"
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={jumpToToday}
              className="px-2 py-0.5 text-xs font-medium text-[#474542] dark:text-neutral-300 hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 rounded"
            >
              Today
            </button>
            <button
              onClick={nextPeriod}
              className="p-1 text-[#787774] hover:text-[#37352f] dark:hover:text-neutral-100 rounded hover:bg-[#f1f1ef] dark:hover:bg-neutral-800"
              title="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="border border-[#e5e4e0] dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-[#181818] shadow-2xs">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 border-b border-[#e8e7e3] dark:border-neutral-800 bg-[#fbfbfa] dark:bg-neutral-900/60 text-center py-2 text-xs font-medium text-[#787774]">
            {dayNames.map((name) => (
              <div key={name}>{name}</div>
            ))}
          </div>

          {/* 7x6 Month Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#ecebe7] dark:divide-neutral-800/80">
            {calendarCells.map((cell, index) => {
              const dayTasks = getTasksForDate(cell.date);
              const isTodayCell = isSameDay(cell.date, today);

              return (
                <div
                  key={index}
                  className={`min-h-[115px] sm:min-h-[130px] p-1.5 flex flex-col group transition-colors ${
                    cell.isCurrentMonth
                      ? 'bg-white dark:bg-[#181818]'
                      : 'bg-[#faf9f7] dark:bg-[#141414]/50 opacity-45'
                  } hover:bg-[#fcfbf9] dark:hover:bg-neutral-800/30`}
                >
                  {/* Date number & Quick Add button */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isTodayCell
                          ? 'bg-[#eef4ee] text-[#2c5b40] border border-[#d4e6d3] font-bold'
                          : 'text-[#474542] dark:text-neutral-300'
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>

                    <button
                      onClick={() => {
                        const dateStr = cell.date.toISOString().slice(0, 10) + 'T17:00';
                        onAddTaskOnDate(dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-[#9c9a95] hover:text-[#37352f] dark:hover:text-neutral-200 rounded hover:bg-[#f1f1ef] dark:hover:bg-neutral-700 transition-opacity"
                      title="Add task on this day"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tasks in this day */}
                  <div className="space-y-1 overflow-y-auto flex-1 max-h-[105px]">
                    {dayTasks.map((task) => {
                      const isDone = task.status === 'completed';
                      const timeStr = new Date(task.dueDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={task.id}
                          onClick={() => onSelectTask(task)}
                          className={`px-1.5 py-0.5 rounded-md text-[11px] font-medium border truncate cursor-pointer transition-all hover:opacity-85 ${getSourceColor(
                            task.source
                          )} ${isDone ? 'opacity-40 line-through' : ''}`}
                          title={`${task.title} • ${timeStr} • ${task.courseCode || task.courseName || task.source}`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <span className="font-mono text-[9px] opacity-75 shrink-0">{timeStr}</span>
                            <span className="truncate">{task.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="border border-[#e5e4e0] dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-[#181818] shadow-2xs">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 border-b border-[#e8e7e3] dark:border-neutral-800 bg-[#fbfbfa] dark:bg-neutral-900/60 text-center py-2.5 text-xs font-medium text-[#787774]">
            {weekDays.map((day, idx) => {
              const isTodayDay = isSameDay(day, today);
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="text-[11px] uppercase tracking-wider">{dayNames[day.getDay()]}</div>
                  <div
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      isTodayDay
                        ? 'bg-[#eef4ee] text-[#2c5b40] border border-[#d4e6d3]'
                        : 'text-[#474542] dark:text-neutral-200'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 7 Columns for the week */}
          <div className="grid grid-cols-7 divide-x divide-[#ecebe7] dark:divide-neutral-800 min-h-[480px]">
            {weekDays.map((day, idx) => {
              const dayTasks = getTasksForDate(day);
              return (
                <div key={idx} className="p-2 space-y-2 bg-white dark:bg-[#181818]">
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const dateStr = day.toISOString().slice(0, 10) + 'T17:00';
                        onAddTaskOnDate(dateStr);
                      }}
                      className="p-1 text-[#9c9a95] hover:text-[#37352f] dark:hover:text-neutral-200 rounded hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 text-[10px] flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>

                  {dayTasks.length === 0 ? (
                    <div className="text-center py-8 text-[#b8b6b1] dark:text-neutral-700 text-xs">
                      No deadlines
                    </div>
                  ) : (
                    dayTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer shadow-2xs hover:opacity-85 transition-all space-y-1 ${getSourceColor(
                          task.source
                        )}`}
                      >
                        <div className="flex items-center justify-between text-[10px] opacity-80 font-mono">
                          <span>
                            {new Date(task.dueDate).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="capitalize">{task.priority}</span>
                        </div>
                        <div className="font-semibold text-[#37352f] dark:text-neutral-100 truncate">
                          {task.title}
                        </div>
                        {(task.courseCode || task.courseName) && (
                          <div className="text-[10px] text-[#787774] dark:text-neutral-400 truncate">
                            {task.courseCode || task.courseName}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
