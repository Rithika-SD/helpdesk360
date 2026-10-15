import React from 'react';
import { Laptop, Network, Boxes, KeyRound, HelpCircle } from 'lucide-react';

const CATEGORY_CONFIG = {
  hardware: {
    label: 'Hardware',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Laptop,
  },
  network: {
    label: 'Network',
    bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    icon: Network,
  },
  software: {
    label: 'Software',
    bg: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: Boxes,
  },
  'account-access': {
    label: 'Account Access',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: KeyRound,
  },
};

export function CategoryBadge({ category }) {
  const config = CATEGORY_CONFIG[category] || {
    label: category || 'General',
    bg: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: HelpCircle,
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${config.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </span>
  );
}
