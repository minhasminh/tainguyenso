import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { auditLogService } from '../services/auditLogService';
import { useToast } from '../hooks/useToast';
import { ActivityLog } from '../types';
import { formatDateTime, getActionInfo, getRoleInfo } from '../utils/formatters';
import { ClipboardList, Shield, RefreshCw, Loader2, Clock, Info } from 'lucide-react';

export function AuditLogsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await auditLogService.getLogs(profile);
      setLogs(data);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải nhật ký hoạt động.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Nhật ký Hoạt động Hệ thống (Audit Logs)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {logs.length} bản ghi
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ghi vết bất biến các hành động quan trọng: Đăng nhập, Đổi vai trò, Khóa tài khoản, Cập nhật hồ sơ
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-900 mb-0.5">Quy tắc bảo mật Nhật ký (Append-Only):</h4>
          <p className="leading-relaxed">
            Dữ liệu nhật ký hoạt động được bảo vệ nghiêm ngặt bởi Row Level Security. Không người dùng nào (kể cả Quản trị viên) được phép chỉnh sửa hoặc xóa lịch sử đã ghi nhận.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
            <span>Đang tải nhật ký bảo mật...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Chưa có ghi nhận hoạt động nào trong hệ thống.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                  <th className="py-3 px-4">Hành động</th>
                  <th className="py-3 px-4">Thực thể</th>
                  <th className="py-3 px-4">Thông tin chi tiết (Metadata)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => {
                  const actInfo = getActionInfo(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatDateTime(log.created_at)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {log.user?.full_name || 'Hệ thống / Vãng lai'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {log.user?.email || log.user_id}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${actInfo.badgeClass}`}>
                          {actInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {log.entity_type} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                      </td>

                      <td className="py-3 px-4">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <pre className="text-[10px] bg-slate-50 p-1.5 rounded border border-slate-100 font-mono text-slate-600 max-w-xs sm:max-w-md overflow-x-auto">
                            {JSON.stringify(log.metadata)}
                          </pre>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
