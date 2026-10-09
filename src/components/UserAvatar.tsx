import React from 'react';
import { UserRole } from '../types';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  role?: UserRole;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
}

export function UserAvatar({
  name,
  avatarUrl,
  role,
  size = 'md',
  showBadge = false,
}: UserAvatarProps) {
  const getInitials = (fullName: string) => {
    if (!fullName) return 'GV';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-semibold',
    xl: 'w-20 h-20 text-xl font-bold',
  };

  const badgeColors: Record<UserRole, string> = {
    ADMIN: 'bg-rose-500 border-white',
    SCHOOL_ADMIN: 'bg-purple-500 border-white',
    VICE_PRINCIPAL: 'bg-indigo-500 border-white',
    SUBJECT_LEADER: 'bg-amber-500 border-white',
    VICE_SUBJECT_LEADER: 'bg-orange-500 border-white',
    TEACHER: 'bg-blue-500 border-white',
  };

  return (
    <div className="relative inline-flex flex-shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover border border-slate-200 shadow-xs`}
          onError={(e) => {
            // fallback if broken image
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-medium shadow-xs`}
        >
          {getInitials(name)}
        </div>
      )}

      {showBadge && role && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${badgeColors[role]}`}
          title={role}
        />
      )}
    </div>
  );
}
