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
          // Soft pastel sage green
          bg: 'bg-[#eef4ee] text-[#2d5c41] border-[#d7e5d6] dark:bg-[#1a2920] dark:text-[#a3d4b6] dark:border-[#274232]',
          icon: GraduationCap,
        };
      case 'moodle':
        return {
          label: 'Moodle',
          displayName: courseCode || courseName || 'Moodle',
          // Soft pastel apricot / peach
          bg: 'bg-[#faf0e8] text-[#8a4e1d] border-[#f1dac9] dark:bg-[#2a1e16] dark:text-[#f0b58a] dark:border-[#453023]',
          icon: BookOpen,
        };
      case 'notion':
        return {
          label: 'Notion',
          displayName: courseName || 'Notion OS',
          // Soft pastel warm gray
          bg: 'bg-[#f2f1ee] text-[#474542] border-[#dedcd7] dark:bg-[#242322] dark:text-[#d4d1cb] dark:border-[#3b3937]',
          icon: Layers,
        };
      case 'trello':
        return {
          label: 'Trello',
          displayName: courseName || 'Trello Board',
          // Soft pastel powder blue
          bg: 'bg-[#edf4f9] text-[#275c7d] border-[#d0e2ee] dark:bg-[#182631] dark:text-[#9bcbe6] dark:border-[#263c4d]',
          icon: LayoutGrid,
        };
      case 'personal':
      default:
        return {
          label: 'Personal',
          displayName: 'Personal',
          // Soft pastel lavender
          bg: 'bg-[#f4f1f8] text-[#5b3c77] border-[#ded5e9] dark:bg-[#241c2c] dark:text-[#ccaee6] dark:border-[#3f314c]',
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
      className={`inline-flex items-center gap-1.5 font-medium border rounded-md px-2 py-0.5 whitespace-nowrap transition-colors tracking-tight ${config.bg} ${
        size === 'sm' ? 'text-xs' : 'text-sm px-2.5 py-1'
      }`}
      title={`${config.label}${courseName ? ` • ${courseName}` : ''}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3 shrink-0 opacity-80' : 'w-3.5 h-3.5 shrink-0 opacity-80'} />
      <span className="truncate max-w-[130px]">{textToDisplay}</span>
    </span>
  );
};
