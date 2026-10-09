import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-slate-200/70 rounded-lg animate-shimmer ${className}`}
    />
  );
}

export function ResourceCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-20 h-5 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-full h-5 rounded-md" />
        <Skeleton className="w-2/3 h-4 rounded-md" />
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <Skeleton className="w-6 h-6 rounded-full" />
        <Skeleton className="w-32 h-4 rounded-md" />
      </div>
    </div>
  );
}
