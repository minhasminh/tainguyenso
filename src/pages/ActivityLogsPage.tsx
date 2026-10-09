import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { auditLogService } from '../services/auditLogService';
import { userService } from '../services/userService';
import { useToast } from '../hooks/useToast';
import { ActivityLog, ActivityAction, Profile } from '../types';
import { formatVietnamDateTime } from '../utils/formatters';
import {
  ClipboardList,
  Shield,
  RefreshCw,
  Loader2,
  Clock,
  Filter,
  Search,
  Download,
  Calendar,
  User,
  Activity,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

export function ActivityLogsPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Profile[]>([]);

  // Filters
  const [actorId, setActorId] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityType, setEntityType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Load user list for filtering if admin/leader
  useEffect(() => {
    async function loadUsers() {
      if (
        profile?.role === 'ADMIN' ||
        profile?.role === 'SCHOOL_ADMIN' ||
        profile?.role === 'VICE_PRINCIPAL' ||
        profile?.role === 'SUBJECT_LEADER' ||
        profile?.role === 'VICE_SUBJECT_LEADER'
      ) {
        try {
          const u = await userService.getProfiles(profile);
          setUsers(u);
        } catch (e) {
          console.warn('Failed to load users for filter:', e);
        }
      }
    }
    loadUsers();
  }, [profile]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await auditLogService.getActivityLogs(profile, {
        actor_id: actorId !== 'all' ? actorId : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        entity_type: entityType !== 'all' ? entityType : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: searchTerm.trim() || undefined,
        page,
        pageSize,
      });
      setLogs(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải nhật ký hoạt động.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [profile, page, pageSize, actorId, actionFilter, entityType, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const handleResetFilters = () => {
    setActorId('all');
    setActionFilter('all');
    setEntityType('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setPage(1);
  };

  const handleExportLogs = async () => {
    try {
      await auditLogService.exportLogsToCSV(profile, {
        actor_id: actorId !== 'all' ? actorId : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        entity_type: entityType !== 'all' ? entityType : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: searchTerm.trim() || undefined,
      });
      toast.success('Đã xuất báo cáo nhật ký ra file CSV.');
    } catch (err: any) {
      toast.error(err.message || 'Không thể xuất báo cáo.');
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
      case 'CREATE_RESOURCE':
        return { label: 'Tạo mới', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'UPDATE':
      case 'UPDATE_RESOURCE':
        return { label: 'Cập nhật', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'DELETE':
      case 'DELETE_RESOURCE':
      case 'USER_DELETE':
        return { label: 'Xóa bỏ', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'SUBMIT':
      case 'SUBMIT_RESOURCE':
        return { label: 'Gửi duyệt', bg: 'bg-sky-100 text-sky-800 border-sky-200' };
      case 'APPROVE':
        return { label: 'Phê duyệt', bg: 'bg-teal-100 text-teal-800 border-teal-200' };
      case 'REQUEST_REVISION':
        return { label: 'Yêu cầu sửa', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'REJECT':
        return { label: 'Từ chối', bg: 'bg-red-100 text-red-800 border-red-200' };
      case 'ARCHIVE':
      case 'ARCHIVE_RESOURCE':
        return { label: 'Lưu trữ', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
      case 'CREATE_QR':
      case 'DOWNLOAD_QR':
      case 'PRINT_QR':
        return { label: 'Mã QR Code', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'EXPORT':
        return { label: 'Xuất dữ liệu', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'LOGIN':
        return { label: 'Đăng nhập', bg: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
      case 'LOGOUT':
        return { label: 'Đăng xuất', bg: 'bg-gray-100 text-gray-800 border-gray-200' };
      default:
        return { label: action, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Nhật Ký Hoạt Động (Activity Logs)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {total} bản ghi
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ghi vết bất biến toàn bộ hoạt động quan trọng: Khởi tạo, Cập nhật, Thẩm định, Phê duyệt, QR Code, Xuất báo cáo
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportLogs}
            disabled={loading || total === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất Excel/CSV
          </button>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Security Banner (Immutable Append-Only Rule) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm flex items-start gap-3.5 border border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5 border border-indigo-400/30">
          <Shield className="w-5 h-5" />
        </div>
        <div className="text-xs leading-relaxed space-y-1">
          <div className="font-bold text-slate-100 flex items-center gap-2">
            <span>Nguyên tắc Bảo mật Nhật ký (Append-Only & Tamper-Proof):</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
              IMMUTABLE
            </span>
          </div>
          <p className="text-slate-300">
            Dữ liệu nhật ký được bảo vệ tuyệt đối theo chính sách Row Level Security (RLS). Không người dùng nào, bao gồm cả Quản trị viên, được cấp quyền chỉnh sửa (`UPDATE`) hoặc xóa bỏ (`DELETE`) lịch sử đã ghi nhận.
          </p>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Từ khóa tìm kiếm
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo mô tả, tên tài nguyên, nội dung góp ý..."
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
              />
            </div>
          </div>

          {/* Actor Filter */}
          {users.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Người thực hiện
              </label>
              <select
                value={actorId}
                onChange={(e) => {
                  setActorId(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
              >
                <option value="all">Tất cả cán bộ / giáo viên</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Hành động
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
            >
              <option value="all">Tất cả hành động</option>
              <option value="CREATE">CREATE (Tạo mới tài nguyên)</option>
              <option value="UPDATE">UPDATE (Cập nhật tài nguyên)</option>
              <option value="SUBMIT">SUBMIT (Gửi duyệt tài nguyên)</option>
              <option value="APPROVE">APPROVE (Thẩm định & Phê duyệt)</option>
              <option value="REQUEST_REVISION">REQUEST_REVISION (Yêu cầu chỉnh sửa)</option>
              <option value="REJECT">REJECT (Từ chối duyệt)</option>
              <option value="DELETE">DELETE (Xóa tài nguyên)</option>
              <option value="ARCHIVE">ARCHIVE (Lưu trữ)</option>
              <option value="DOWNLOAD_QR">DOWNLOAD_QR (Tải mã QR)</option>
              <option value="PRINT_QR">PRINT_QR (In mã QR)</option>
              <option value="EXPORT">EXPORT (Xuất báo cáo CSV)</option>
              <option value="LOGIN">LOGIN (Đăng nhập)</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Thực thể đối tượng
            </label>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
            >
              <option value="all">Tất cả thực thể</option>
              <option value="RESOURCE">RESOURCE (Tài nguyên)</option>
              <option value="USER">USER (Người dùng / Giáo viên)</option>
              <option value="NOTIFICATION">NOTIFICATION (Thông báo)</option>
              <option value="SEARCH">SEARCH (Bộ lọc tìm kiếm)</option>
              <option value="SYSTEM">SYSTEM (Hệ thống)</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Từ ngày
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Đến ngày
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Lọc nhật ký
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer"
              title="Đặt lại bộ lọc"
            >
              Đặt lại
            </button>
          </div>
        </form>
      </div>

      {/* Table Data Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500 text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <span>Đang nạp nhật ký kiểm toán bất biến...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-1">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="font-semibold text-slate-700 text-sm">Không tìm thấy bản ghi nào</div>
            <p className="text-slate-400">Thử thay đổi hoặc xóa bỏ các điều kiện lọc ở trên.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Thời gian (VN)</th>
                  <th className="py-3.5 px-4">Người thực hiện</th>
                  <th className="py-3.5 px-4">Hành động</th>
                  <th className="py-3.5 px-4">Đối tượng</th>
                  <th className="py-3.5 px-4">Nội dung chi tiết / Lý do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const actor = log.actor || log.user;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      {/* Time */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {formatVietnamDateTime(log.created_at)}
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {actor?.full_name || 'Hệ thống'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {actor?.role || 'SYSTEM'} {actor?.email ? `• ${actor.email}` : ''}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-medium text-slate-600">
                          {log.entity_type}
                        </span>
                        {log.entity_id && (
                          <span className="block text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                            {log.entity_id}
                          </span>
                        )}
                      </td>

                      {/* Description & Metadata */}
                      <td className="py-3 px-4">
                        {log.description ? (
                          <div className="text-xs text-slate-800 leading-snug font-medium mb-1">
                            {log.description}
                          </div>
                        ) : null}

                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="text-[11px] text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-lg overflow-x-auto">
                            {Object.entries(log.metadata)
                              .filter(([k]) => k !== 'title' && k !== 'description')
                              .map(([k, v]) => (
                                <div key={k} className="truncate">
                                  <span className="text-slate-400">{k}:</span>{' '}
                                  <span className="text-slate-700">{JSON.stringify(v)}</span>
                                </div>
                              ))}
                            {log.metadata.title && (
                              <div className="font-sans text-slate-700 font-medium">
                                Tiêu đề: "{log.metadata.title}"
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Trang <span className="font-bold text-slate-900">{page}</span> / {totalPages} (Tổng số {total} bản ghi)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition disabled:opacity-40 cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pNum = i + 1;
                if (totalPages > 5 && page > 3) {
                  pNum = page - 3 + i;
                  if (pNum > totalPages) pNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setPage(pNum)}
                    className={`w-7 h-7 rounded-lg font-bold text-xs transition cursor-pointer ${
                      page === pNum
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition disabled:opacity-40 cursor-pointer"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
