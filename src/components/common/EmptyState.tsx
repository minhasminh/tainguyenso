import React from 'react';
import { FolderOpen, Plus, SearchX, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'folder' | 'search' | 'alert';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function EmptyState({
  icon = 'folder',
  title,
  description,
  actionText,
  onAction,
  actionHref,
}: EmptyStateProps) {
  let IconComponent = FolderOpen;
  let iconBg = 'bg-blue-50 text-blue-600';

  if (icon === 'search') {
    IconComponent = SearchX;
    iconBg = 'bg-slate-100 text-slate-500';
  } else if (icon === 'alert') {
    IconComponent = AlertCircle;
    iconBg = 'bg-amber-50 text-amber-600';
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xs">
      <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center mx-auto mb-4 shadow-xs`}>
        <IconComponent className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
        {description}
      </p>

      {actionText && (
        actionHref ? (
          <a
            href={actionHref}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-smooth cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{actionText}</span>
          </a>
        ) : onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-smooth cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{actionText}</span>
          </button>
        ) : null
      )}
    </div>
  );
}
