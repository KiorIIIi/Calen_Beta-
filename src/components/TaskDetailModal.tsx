import React, { useState } from 'react';
import { Task, TaskPriority, TaskStatus } from '../types';
import { SourceBadge } from './SourceBadge';
import { PriorityBadge } from './PriorityBadge';
import { 
  X, 
  ExternalLink, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  FileText, 
  BookOpen, 
  Tag, 
  Sparkles,
  CheckSquare
} from 'lucide-react';
import { playSuccessChime } from '../services/audioChime';

interface Props {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (updated: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskDetailModal: React.FC<Props> = ({
  task,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
}) => {
  const [newChecklistText, setNewChecklistText] = useState('');

  if (!isOpen || !task) return null;

  const handleStatusChange = (status: TaskStatus) => {
    if (status === 'completed' && task.status !== 'completed') {
      playSuccessChime();
    }
    onUpdateTask({
      ...task,
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
    });
  };

  const handlePriorityChange = (priority: TaskPriority) => {
    onUpdateTask({ ...task, priority });
  };

  const handleDueDateChange = (newDueDate: string) => {
    onUpdateTask({ ...task, dueDate: newDueDate });
  };

  const handleTitleChange = (newTitle: string) => {
    onUpdateTask({ ...task, title: newTitle });
  };

  const handleNotesChange = (notes: string) => {
    onUpdateTask({ ...task, notes });
  };

  const handleToggleChecklist = (checkId: string) => {
    const updated = (task.checklist || []).map((item) =>
      item.id === checkId ? { ...item, done: !item.done } : item
    );
    onUpdateTask({ ...task, checklist: updated });
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const newItem = {
      id: `cl-${Date.now()}`,
      text: newChecklistText.trim(),
      done: false,
    };
    onUpdateTask({
      ...task,
      checklist: [...(task.checklist || []), newItem],
    });
    setNewChecklistText('');
  };

  const handleDeleteChecklistItem = (checkId: string) => {
    const updated = (task.checklist || []).filter((item) => item.id !== checkId);
    onUpdateTask({ ...task, checklist: updated });
  };

  const dueTime = new Date(task.dueDate).getTime();
  const diffMinutes = Math.round((dueTime - Date.now()) / (1000 * 60));
  const isOverdue = diffMinutes < 0 && task.status !== 'completed';
  const isDueSoon = diffMinutes > 0 && diffMinutes <= 180 && task.status !== 'completed';

  const checklistCount = task.checklist?.length || 0;
  const completedChecklistCount = task.checklist?.filter((c) => c.done).length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#191919] text-[#37352f] dark:text-[#d4d4d4] rounded-xl shadow-xl border border-[#e5e4e0] dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Notion-style Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#e8e7e3] dark:border-neutral-800/80 bg-[#fbfbfa] dark:bg-neutral-900/50 text-xs text-[#787774]">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="hover:text-[#37352f] cursor-pointer" onClick={onClose}>Calen</span>
            <span>/</span>
            <span className="capitalize">{task.source}</span>
            {task.courseCode && (
              <>
                <span>/</span>
                <span className="font-semibold text-[#37352f] dark:text-neutral-200">{task.courseCode}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {task.externalUrl && (
              <a
                href={task.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 text-[#474542] dark:text-neutral-300 transition-colors"
                title="Open in platform"
              >
                <span>Open in {task.source === 'classroom' ? 'Classroom' : task.source === 'moodle' ? 'Moodle' : task.source}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => {
                if (window.confirm('Delete this task?')) {
                  onDeleteTask(task.id);
                  onClose();
                }
              }}
              className="p-1.5 text-[#9c9a95] hover:text-[#9c3434] rounded hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#9c9a95] hover:text-[#37352f] dark:hover:text-neutral-200 rounded hover:bg-[#f1f1ef] dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Overdue / Due soon banner with soft pastels */}
          {isOverdue && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#faebeb] text-[#9c3434] border border-[#f4cccc] dark:bg-[#2b1919] dark:text-[#f29b9b] dark:border-[#482828] text-sm">
              <AlertCircle className="w-4 h-4 text-[#9c3434] shrink-0" />
              <div>
                <span className="font-semibold">Overdue: </span>
                This deadline was due {Math.abs(Math.round(diffMinutes / 60))} hours ago.
              </div>
            </div>
          )}

          {isDueSoon && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#fbf5e5] text-[#7d5d14] border border-[#f0e3bf] dark:bg-[#292415] dark:text-[#e8c76b] dark:border-[#42391e] text-sm">
              <Clock className="w-4 h-4 text-[#7d5d14] shrink-0" />
              <div>
                <span className="font-semibold">Due Soon: </span>
                Less than 3 hours remaining before cutoff!
              </div>
            </div>
          )}

          {/* Editable Title */}
          <div>
            <input
              type="text"
              value={task.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full text-2xl font-bold text-[#37352f] dark:text-neutral-100 placeholder-[#9c9a95] focus:outline-none border-b border-transparent focus:border-[#d4d1cb] dark:focus:border-neutral-700 pb-1"
              placeholder="Task or Assignment title..."
            />
            {task.description && (
              <p className="mt-2 text-sm text-[#605e5a] dark:text-neutral-400 leading-relaxed">
                {task.description}
              </p>
            )}
          </div>

          {/* Notion Properties Grid */}
          <div className="bg-[#fbfbfa] dark:bg-neutral-900/40 border border-[#e5e4e0] dark:border-neutral-800 rounded-lg p-3.5 space-y-2.5 text-xs">
            {/* Status */}
            <div className="grid grid-cols-3 items-center">
              <span className="text-[#787774] font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#9c9a95]" />
                Status
              </span>
              <div className="col-span-2 flex items-center gap-1.5">
                {(['todo', 'in_progress', 'completed'] as TaskStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      task.status === st
                        ? st === 'completed'
                          ? 'bg-[#eef4ee] text-[#2d5c41] border-[#d7e5d6] font-semibold'
                          : st === 'in_progress'
                          ? 'bg-[#edf4f9] text-[#275c7d] border-[#d0e2ee] font-semibold'
                          : 'bg-[#f2f1ef] text-[#5e5c59] border-[#e0deda] font-semibold'
                        : 'bg-white dark:bg-neutral-800 text-[#787774] dark:text-neutral-400 border-[#e5e4e0] dark:border-neutral-700 hover:bg-[#f1f1ef]'
                    }`}
                  >
                    {st === 'todo' ? 'To Do' : st === 'in_progress' ? 'In Progress' : 'Completed ✓'}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date & Time */}
            <div className="grid grid-cols-3 items-center">
              <span className="text-[#787774] font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#9c9a95]" />
                Due Date
              </span>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={task.dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-[#e5e4e0] dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-[#37352f] dark:text-neutral-200 focus:outline-none focus:border-[#b4b2ac]"
                />
              </div>
            </div>

            {/* Source & Course */}
            <div className="grid grid-cols-3 items-center">
              <span className="text-[#787774] font-medium flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#9c9a95]" />
                Course / Platform
              </span>
              <div className="col-span-2 flex items-center gap-2 flex-wrap">
                <SourceBadge
                  source={task.source}
                  courseName={task.courseName}
                  courseCode={task.courseCode}
                  size="sm"
                />
                {task.moduleName && (
                  <span className="text-[#787774] text-[11px] bg-[#f1f1ef] dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-[#e5e4e0] dark:border-neutral-700">
                    {task.moduleName}
                  </span>
                )}
              </div>
            </div>

            {/* Priority */}
            <div className="grid grid-cols-3 items-center">
              <span className="text-[#787774] font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#9c9a95]" />
                Priority
              </span>
              <div className="col-span-2 flex items-center gap-1.5">
                {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className={`px-1 py-0.5 rounded transition-all ${
                      task.priority === p ? 'ring-1 ring-[#b4b2ac] font-semibold' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <PriorityBadge priority={p} size="sm" />
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="grid grid-cols-3 items-center">
                <span className="text-[#787774] font-medium flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#9c9a95]" />
                  Tags
                </span>
                <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                  {task.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-[#f1f1ef] dark:bg-neutral-800 text-[#605e5a] dark:text-neutral-300 rounded text-[11px] border border-[#e5e4e0] dark:border-neutral-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subtasks / Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#787774] flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" />
                Checklist / Steps {checklistCount > 0 && `(${completedChecklistCount}/${checklistCount})`}
              </h4>
              {checklistCount > 0 && (
                <div className="w-24 h-1.5 bg-[#e5e4e0] dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7eb897] transition-all duration-300"
                    style={{ width: `${(completedChecklistCount / checklistCount) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              {(task.checklist || []).map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-2 rounded hover:bg-[#fbfbfa] dark:hover:bg-neutral-900 border border-transparent hover:border-[#e5e4e0] dark:hover:border-neutral-800 transition-all text-sm"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggleChecklist(item.id)}
                      className="w-4 h-4 rounded text-[#37352f] focus:ring-0 cursor-pointer accent-[#448361]"
                    />
                    <span
                      className={`${
                        item.done ? 'line-through text-[#9c9a95]' : 'text-[#37352f] dark:text-neutral-200'
                      }`}
                    >
                      {item.text}
                    </span>
                  </label>
                  <button
                    onClick={() => handleDeleteChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#9c9a95] hover:text-[#9c3434] transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <form onSubmit={handleAddChecklist} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add a step (e.g., Read pages 40-60, Run test cases)..."
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-[#e5e4e0] dark:border-neutral-800 rounded-md bg-transparent focus:outline-none focus:border-[#b4b2ac] placeholder-[#9c9a95]"
                />
                <button
                  type="submit"
                  disabled={!newChecklistText.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#37352f] hover:bg-[#272623] dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium rounded-md disabled:opacity-40 transition-opacity"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </form>
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#787774] flex items-center gap-1.5 mb-2">
              <FileText className="w-3.5 h-3.5" />
              Notes & Submission Guidelines
            </h4>
            <textarea
              rows={4}
              value={task.notes || ''}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Paste notes, professor tips, LaTeX commands, or rubric reminders..."
              className="w-full p-3 text-xs border border-[#e5e4e0] dark:border-neutral-800 rounded-lg bg-[#fbfbfa] dark:bg-neutral-900/30 text-[#37352f] dark:text-neutral-200 focus:outline-none focus:border-[#b4b2ac] resize-none font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e8e7e3] dark:border-neutral-800 flex justify-end bg-[#fbfbfa] dark:bg-neutral-900/30">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-[#37352f] hover:bg-[#272623] text-white dark:bg-neutral-100 dark:text-neutral-900 rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
