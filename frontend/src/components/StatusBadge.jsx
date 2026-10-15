import React from 'react';

const STATUS_CONFIG = {
  open: {
    label: 'Open',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  'in-progress': {
    label: 'In Progress',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500 animate-pulse',
  },
  resolved: {
    label: 'Resolved',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  closed: {
    label: 'Closed',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
};

export function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    bg: 'bg-gray-100 text-gray-700 border-gray-200',
    dot: 'bg-gray-400',
  };

  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
}
