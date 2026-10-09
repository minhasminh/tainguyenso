import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { notificationService } from '../services/notificationService';
import { realtimeService } from '../services/realtimeService';
import { AppNotification, NotificationType } from '../types';
import { formatVietnamDateTime } from '../utils/formatters';
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
  Filter,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [tab, setTab] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(profile);
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribeLocal = notificationService.subscribe(() => {
      loadData();
    });

    let unsubscribeRealtime: (() => void) | undefined;
    if (profile?.id) {
      unsubscribeRealtime = realtimeService.subscribeToNotifications(profile.id, () => {
        loadData();
      });
    }

    return () => {
      unsubscribeLocal();
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, [profile]);

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead(profile);
    await loadData();
  };

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await notificationService.markAsRead(notif.id, profile);
    }
    if (notif.resource_id) {
      window.location.hash = `#/resources/${notif.resource_id}`;
    }
  };

  const filtered = notifications.filter((n) => {
    if (tab === 'unread' && n.is_read) return false;
    if (tab === 'read' && !n.is_read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchMsg = n.message.toLowerCase().includes(q);
      const matchActor = n.actor?.full_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg && !matchActor) return false;
    }
    return true;
  });

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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Trung Tâm Thông Báo
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                {unreadCount} chưa đọc
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi tiến độ thẩm định, phê duyệt và phản hồi tài nguyên số của bạn
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-indigo-600" />
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                tab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              onClick={() => setTab('unread')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                tab === 'unread' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
            <button
              onClick={() => setTab('read')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                tab === 'read' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã đọc ({notifications.length - unreadCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm thông báo..."
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
            />
          </div>
        </div>

        {/* Category Type Filter */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs overflow-x-auto pb-1">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-slate-500 text-[11px] font-medium flex-shrink-0">Loại thông báo:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tất cả các loại</option>
            <option value="RESOURCE_SUBMITTED">Gửi duyệt mới</option>
            <option value="RESOURCE_SUBJECT_LEADER_APPROVED">Tổ trưởng thông qua</option>
            <option value="RESOURCE_SCHOOL_APPROVED">BGH phê duyệt chính thức</option>
            <option value="RESOURCE_SUBJECT_LEADER_REVISION">Yêu cầu chỉnh sửa (Tổ)</option>
            <option value="RESOURCE_SCHOOL_REVISION">Yêu cầu chỉnh sửa (BGH)</option>
            <option value="RESOURCE_SUBJECT_LEADER_REJECTED">Từ chối duyệt</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <h3 className="font-semibold text-slate-700 text-sm">Không tìm thấy thông báo nào</h3>
            <p className="mt-1 text-slate-400">Bạn đã cập nhật hết toàn bộ thông báo trong danh mục này.</p>
          </div>
        ) : (
          filtered.map((notif) => {
            const iconConf = getNotifIcon(notif.type);
            const Icon = iconConf.icon;

            return (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`p-4 sm:p-5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-4 ${
                  !notif.is_read ? 'bg-indigo-50/30' : ''
                }`}
              >
                {/* Type Icon */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs ${iconConf.bg}`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm ${
                          !notif.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                        }`}
                      >
                        {notif.title}
                      </h3>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {formatVietnamDateTime(notif.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-sans whitespace-pre-line">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100/80 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-500">
                      {notif.actor && (
                        <span>
                          Thực hiện bởi: <strong className="text-slate-700">{notif.actor.full_name}</strong>{' '}
                          ({notif.actor.role})
                        </span>
                      )}
                    </div>

                    {notif.resource_id && (
                      <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800">
                        <span>Mở tài nguyên</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
