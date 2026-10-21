import React from 'react';
import { TaskPriority } from '../types';
import { Flame, ArrowUp, Minus, ArrowDown, ChevronDown } from 'lucide-react';

interface Props {
  priority: TaskPriority;
  size?: 'sm' | 'md';
  onClick?: (e: React.MouseEvent) => void;
  interactive?: boolean;
}

export const PriorityBadge: React.FC<Props> = ({ 
  priority, 
  size = 'sm', 
  onClick, 
  interactive = false 
}) => {
  const getConfig = () => {
    switch (priority) {
      case 'urgent':
        return {
          label: 'Urgent',
          bg: 'bg-[#faebeb] text-[#9c3434] border-[#f4cccc] dark:bg-[#2b1919] dark:text-[#f29b9b] dark:border-[#482828]',
          dotColor: 'bg-[#cf6666]',
          icon: Flame,
        };
      case 'high':
        return {
          label: 'High',
          bg: 'bg-[#faf0e8] text-[#944e1c] border-[#f1dac9] dark:bg-[#2a1c14] dark:text-[#f0ad7d] dark:border-[#483023]',
          dotColor: 'bg-[#d67b45]',
          icon: ArrowUp,
        };
      case 'medium':
        return {
          label: 'Medium',
          bg: 'bg-[#fbf5e5] text-[#7d5d14] border-[#f0e3bf] dark:bg-[#292415] dark:text-[#e8c76b] dark:border-[#42391e]',
          dotColor: 'bg-[#d4b14e]',
          icon: Minus,
        };
      case 'low':
      default:
        return {
          label: 'Low',
          bg: 'bg-[#f2f1ef] text-[#5e5c59] border-[#e0deda] dark:bg-[#232322] dark:text-[#c4c2be] dark:border-[#383735]',
          dotColor: 'bg-[#a3a099]',
          icon: ArrowDown,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <span
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      title={interactive ? `Priority: ${config.label} (click to change)` : `Priority: ${config.label}`}
      className={`inline-flex items-center gap-1 font-medium border rounded-md px-2 py-0.5 whitespace-nowrap tracking-tight transition-all select-none ${config.bg} ${
        size === 'sm' ? 'text-[11px]' : 'text-xs px-2.5 py-1'
      } ${interactive ? 'hover:opacity-80 cursor-pointer shadow-2xs' : ''}`}
    >
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5 shrink-0 opacity-85' : 'w-3 h-3 shrink-0 opacity-85'} />
      <span>{config.label}</span>
      {interactive && <ChevronDown className="w-2.5 h-2.5 opacity-50 ml-0.5" />}
    </span>
  );
};
