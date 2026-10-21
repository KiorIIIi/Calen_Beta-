import React from 'react';
import { TaskSource } from '../types';
import { GraduationCap, BookOpen, Layers, LayoutGrid, CheckCircle2 } from 'lucide-react';

interface Props {
  source: TaskSource;
  courseName?: string;
  courseCode?: string;
  size?: 'sm' | 'md';
  showCourse?: boolean;
}

export const SourceBadge: React.FC<Props> = ({
  source,
  courseName,
  courseCode,
  size = 'sm',
  showCourse = true,
}) => {
  const getBadgeConfig = () => {
    switch (source) {
      case 'classroom':
        return {
          label: 'Classroom',
          displayName: courseCode || courseName || 'Classroom',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
          dotBg: 'bg-emerald-500',
          icon: GraduationCap,
        };
      case 'moodle':
        return {
          label: 'Moodle',
          displayName: courseCode || courseName || 'Moodle',
          bg: 'bg-amber-50 text-amber-900 border-amber-200/80',
          dotBg: 'bg-amber-500',
          icon: BookOpen,
        };
      case 'notion':
        return {
          label: 'Notion',
          displayName: courseName || 'Notion OS',
          bg: 'bg-neutral-100 text-neutral-800 border-neutral-300',
          dotBg: 'bg-neutral-700',
          icon: Layers,
        };
      case 'trello':
        return {
          label: 'Trello',
          displayName: courseName || 'Trello Board',
          bg: 'bg-sky-50 text-sky-800 border-sky-200/80',
          dotBg: 'bg-sky-500',
          icon: LayoutGrid,
        };
      case 'personal':
      default:
        return {
          label: 'Personal',
          displayName: 'Personal',
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
          dotBg: 'bg-indigo-500',
          icon: CheckCircle2,
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const textToDisplay = showCourse && (courseCode || courseName)
    ? courseCode || courseName
    : config.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded px-2 py-0.5 whitespace-nowrap transition-colors ${config.bg} ${
        size === 'sm' ? 'text-xs' : 'text-sm px-2.5 py-1'
      }`}
      title={`${config.label}${courseName ? ` • ${courseName}` : ''}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span className="truncate max-w-[130px]">{textToDisplay}</span>
    </span>
  );
};
