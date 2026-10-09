import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { notificationService } from '../../services/notificationService';
import { realtimeService } from '../../services/realtimeService';
import { AppNotification, NotificationType } from '../../types';
import { formatVietnamDateTime } from '../../utils/formatters';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export function NotificationCenter() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!profile) return;
    const res = await notificationService.getNotifications(profile);
    setNotifications(res.notifications);
    setUnreadCount(res.unreadCount);
  };

  useEffect(() => {
    loadNotifications();
    const unsubscribeLocal = notificationService.subscribe(() => {
      loadNotifications();
    });

    let unsubscribeRealtime: (() => void) | undefined;
    if (profile?.id) {
      unsubscribeRealtime = realtimeService.subscribeToNotifications(profile.id, () => {
        loadNotifications();
      });
    }

    return () => {
      unsubscribeLocal();
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, [profile]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead(profile);
    await loadNotifications();
  };

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await notificationService.markAsRead(notif.id, profile);
    }
    setIsOpen(false);
    if (notif.resource_id) {
      window.location.hash = `#/resources/${notif.resource_id}`;
    }
  };

  const displayedList = filterUnreadOnly
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const getNotifIcon = (type: NotificationType) => {
    switch (type) {
      case 'RESOURCE_SUBMITTED':
      case 'RESOURCE_PENDING_SCHOOL_APPROVAL':
        return { icon: Send, bg: 'bg-blue-100 text-blue-700' };
      case 'RESOURCE_SUBJECT_LEADER_APPROVED':
        return { icon: CheckCircle2, bg: 'bg-indigo-100 text-indigo-700' };
      case 'RESOURCE_SCHOOL_APPROVED':
        return { icon: Sparkles, bg: 'bg-emerald-100 text-emerald-700' };
      case 'RESOURCE_SUBJECT_LEADER_REVISION':
      case 'RESOURCE_SCHOOL_REVISION':
        return { icon: AlertTriangle, bg: 'bg-amber-100 text-amber-700' };
      case 'RESOURCE_SUBJECT_LEADER_REJECTED':
      case 'RESOURCE_SCHOOL_REJECTED':
        return { icon: XCircle, bg: 'bg-rose-100 text-rose-700' };
      default:
        return { icon: Info, bg: 'bg-slate-100 text-slate-700' };
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    return formatVietnamDateTime(isoString);
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
        title="Thông báo hệ thống"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Thông báo</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-700 rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đã đọc tất cả
              </button>
            )}
          </div>

          {/* Quick Filter */}
          <div className="px-3.5 py-2 border-b border-slate-100 flex items-center gap-2 text-xs">
            <button
              onClick={() => setFilterUnreadOnly(false)}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                !filterUnreadOnly
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              onClick={() => setFilterUnreadOnly(true)}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterUnreadOnly
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* List of items */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {displayedList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                {filterUnreadOnly ? 'Không có thông báo chưa đọc nào.' : 'Chưa có thông báo nào.'}
              </div>
            ) : (
              displayedList.slice(0, 15).map((notif) => {
                const iconConf = getNotifIcon(notif.type);
                const Icon = iconConf.icon;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3 relative ${
                      !notif.is_read ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${iconConf.bg}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4
                          className={`text-xs truncate ${
                            !notif.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-1.5 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-300" />
                          {formatRelativeTime(notif.created_at)}
                        </span>
                        {notif.actor && (
                          <span className="truncate max-w-[120px] font-medium text-slate-500">
                            bởi {notif.actor.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <a
              href="#/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
            >
              <span>Xem tất cả thông báo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
