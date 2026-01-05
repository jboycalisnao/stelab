import React from 'react';
import { Beaker, Microscope, Atom, Globe, Archive, HandPlatter, Hand, Tag } from 'lucide-react';

// Default categories for fallback or initialization
export const DEFAULT_CATEGORIES = [
  'Chemistry',
  'Biology',
  'Physics',
  'Earth Science',
  'General'
];

const STATIC_COLORS: Record<string, string> = {
  'Chemistry': '#3b82f6', // blue-500
  'Biology': '#10b981',   // emerald-500
  'Physics': '#8b5cf6',   // violet-500
  'Earth Science': '#f59e0b', // amber-500
  'General': '#6b7280',   // gray-500
};

const STATIC_ICONS: Record<string, React.ReactNode> = {
  'Chemistry': <Beaker className="w-5 h-5" />,
  'Biology': <Microscope className="w-5 h-5" />,
  'Physics': <Atom className="w-5 h-5" />,
  'Earth Science': <Globe className="w-5 h-5" />,
  'General': <Archive className="w-5 h-5" />,
};

// Fallback color palette for custom categories
const COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
];

export const getCategoryColor = (category: string): string => {
  if (STATIC_COLORS[category]) return STATIC_COLORS[category];
  
  // Simple hash to pick a color consistently
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
};

export const getCategoryIcon = (category: string): React.ReactNode => {
  if (STATIC_ICONS[category]) return STATIC_ICONS[category];
  return <Tag className="w-5 h-5" />;
};

export const LENDING_ICON = <HandPlatter className="w-5 h-5" />;
export const BORROW_ICON = <Hand className="w-5 h-5" />;