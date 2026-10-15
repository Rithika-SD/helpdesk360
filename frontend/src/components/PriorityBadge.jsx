import React from 'react';
import { AlertTriangle, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';

const PRIORITY_CONFIG = {
  urgent: {
    label: 'Urgent',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: AlertTriangle,
    iconColor: 'text-rose-600',
  },
  high: {
    label: 'High',
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: ArrowUp,
    iconColor: 'text-orange-600',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: ArrowRight,
    iconColor: 'text-amber-600',
  },
  low: {
    label: 'Low',
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: ArrowDown,
    iconColor: 'text-slate-500',
  },
};

export function PriorityBadge({ priority, showIcon = true }) {
  const config = PRIORITY_CONFIG[priority] || {
    label: priority || 'Unknown',
    bg: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: ArrowRight,
    iconColor: 'text-gray-500',
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${config.bg}`}>
      {showIcon && <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />}
      <span>{config.label}</span>
    </span>
  );
}
