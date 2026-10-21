import React from 'react';
import { TaskPriority } from '../types';
import { AlertCircle, AlertTriangle, ArrowUp, Minus } from 'lucide-react';

interface Props {
  priority: TaskPriority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<Props> = ({ priority, size = 'sm' }) => {
  const getConfig = () => {
    switch (priority) {
      case 'urgent':
        return {
          label: 'Urgent',
          bg: 'bg-rose-50 text-rose-800 border-rose-200/80',
          icon: AlertCircle,
        };
      case 'high':
        return {
          label: 'High',
          bg: 'bg-orange-50 text-orange-800 border-orange-200/80',
          icon: AlertTriangle,
        };
      case 'medium':
        return {
          label: 'Medium',
          bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
          icon: ArrowUp,
        };
      case 'low':
      default:
        return {
          label: 'Low',
          bg: 'bg-neutral-100 text-neutral-600 border-neutral-200',
          icon: Minus,
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium border rounded px-1.5 py-0.5 whitespace-nowrap ${config.bg} ${
        size === 'sm' ? 'text-xs' : 'text-sm px-2 py-1'
      }`}
    >
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      <span>{config.label}</span>
    </span>
  );
};
