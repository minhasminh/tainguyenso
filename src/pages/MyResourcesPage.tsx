import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { resourceService } from '../services/resourceService';
import { googleFormService } from '../services/googleFormService';
import { realtimeService } from '../services/realtimeService';
import { useToast } from '../hooks/useToast';
import { Resource, ResourceStatus } from '../types';
import {
  formatVietnamDateTime,
  getResourceStatusInfo,
  detectResourceProvider,
  getProviderInfo,
} from '../utils/formatters';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import {
  FolderOpen,
  Plus,
  ExternalLink,
  Copy,
  Edit3,
  Trash2,
  Clock,
  Send,
  Loader2,
  Filter,
  CheckCircle2,
  AlertCircle,
  Archive,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  UploadCloud,
  Sparkles,
  Info,
} from 'lucide-react';

const TABS: { id: string; label: string; countKey?: ResourceStatus | 'all' }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'draft', label: 'Nháp' },
  { id: 'submitted', label: 'Chờ duyệt' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'rejected', label: 'Từ chối' },
  { id: 'archived', label: 'Lưu trữ' },
];

export function MyResourcesPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'google_form' | 'manual'>('all');

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  const initialSyncRef = useRef(false);

  const loadResources = async (silent: boolean = false, withSync: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      if (withSync) {
        await googleFormService.syncFromBackend(profile);
        await googleFormService.syncFromGoogleSheet(
          '1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU',
          profile,
          profile?.email || 'ducminh1973@gmail.com'
        );
      }

      // Fetch user's resources
      const data = await resourceService.getMyResources(profile, activeTab);
      setResources(data);
    } catch (err: any) {
      if (!silent) {
        toast.error(err.message || 'Không thể tải danh sách tài nguyên của bạn.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const isFirst = !initialSyncRef.current;
    if (isFirst) {
      initialSyncRef.current = true;
    }
    loadResources(false, isFirst);
    const unsubscribe = realtimeService.subscribeToResources(() => {
      loadResources(true, false);
    });
    return unsubscribe;
  }, [profile, activeTab]);

  // Handle Manual Refresh Button (Sections 23 & 24)
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await googleFormService.syncFromBackend(profile, true);
      const sheetRes = await googleFormService.syncFromGoogleSheet(
        '1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU',
        profile,
        profile?.email || 'ducminh1973@gmail.com',
        true
      );
      const data = await resourceService.getMyResources(profile, activeTab);
      setResources(data);
      if (sheetRes.syncedCount > 0) {
        toast.success(`Đã đồng bộ thành công ${sheetRes.syncedCount} tài nguyên mới từ Google Form!`);
      } else {
        toast.success('Danh sách tài nguyên đã được làm mới và đồng bộ.');
      }
    } catch (err: any) {
      toast.error('Lỗi khi làm mới: ' + (err.message || 'Vui lòng thử lại'));
    } finally {
      setRefreshing(false);
    }
  };

  // Filter resources by source if requested
  const filteredResources = resources.filter((r) => {
    if (sourceFilter === 'google_form') return r.source_type === 'google_form';
    if (sourceFilter === 'manual') return r.source_type !== 'google_form';
    return true;
  });

  // Check if any recently submitted via Google Form
  const recentGoogleFormSubmissions = resources.filter(
    (r) => r.source_type === 'google_form' && r.status === 'submitted'
  );

  // Copy link handler (Section 13)
  const handleCopyLink = async (r: Resource, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(r.resource_url);
      resourceService.logResourceCopyLink(r.id, profile, r.title);
      toast.success('Đã sao chép liên kết.');
    } catch {
      toast.error('Không thể truy cập clipboard.');
    }
  };

  // Open resource URL (Section 12 & 39)
  const handleOpenUrl = (r: Resource, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(r.resource_url, '_blank', 'noopener,noreferrer');
  };

  // Submit resource for approval (Section 44)
  const handleSubmitForApproval = async (r: Resource, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await resourceService.submitResource(r.id, 'Giáo viên nộp thẩm định', profile);
      toast.success('Đã gửi tài nguyên để duyệt.');
      loadResources();
    } catch (err: any) {
      toast.error(err.message || 'Không thể gửi duyệt tài nguyên.');
    }
  };

  // Archive resource (Section 20)
  const handleArchive = async (r: Resource, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await resourceService.updateResource(r.id, { status: 'archived' }, profile);
      toast.success('Đã chuyển tài nguyên vào kho lưu trữ.');
      loadResources();
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu trữ tài nguyên.');
    }
  };

  // Delete confirmation
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSubmittingAction(true);
    try {
      await resourceService.deleteResource(deleteTarget.id, profile);
      toast.success('Đã xóa tài nguyên thành công.');
      setDeleteTarget(null);
      loadResources();
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa tài nguyên.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Tài Nguyên Của Tôi
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredResources.length} tài liệu
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý kế hoạch bài dạy, giáo án điện tử, bài giảng và tài liệu của giáo viên {profile?.full_name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Refresh Button (Sections 23 & 24) */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition shadow-xs disabled:opacity-60 cursor-pointer"
            title="Kiểm tra và đồng bộ bài nộp mới nhất"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Đang kiểm tra...' : 'Làm mới'}
          </button>

          {/* Direct Google Form upload link */}
          <a
            href="#/upload-resource"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold hover:bg-purple-100 transition shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
            Tải qua Google Form
          </a>

          {/* Add direct resource */}
          <a
            href="#/resources/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Thêm tài nguyên
          </a>
        </div>
      </div>

      {/* Sync Status Banner for Recently Submitted Google Form Resources */}
      {recentGoogleFormSubmissions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Tài nguyên từ Google Form đã được tiếp nhận thành công</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                  {recentGoogleFormSubmissions.length} bài nộp
                </span>
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Các học liệu Thầy/Cô vừa gửi qua Google Form đã được chuyển sang trạng thái{' '}
                <strong className="text-indigo-700 font-semibold">Chờ duyệt (submitted)</strong> và tự động thông báo đến Tổ trưởng chuyên môn để tiến hành thẩm định 2 cấp.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2 text-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 font-semibold rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Source Filter (Section 14) */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <span className="text-[11px] font-medium text-slate-400">Nguồn:</span>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tất cả nguồn</option>
            <option value="google_form">Google Form</option>
            <option value="manual">Nhập trực tiếp</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <span className="text-xs font-medium">Đang tải tài nguyên...</span>
        </div>
      ) : filteredResources.length === 0 ? (
        /* Empty State (Sections 24 & 48) */
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-1">
            Bạn chưa có tài nguyên nào trong mục này.
          </h3>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Nếu Thầy/Cô vừa gửi học liệu qua Google Form nhúng, hệ thống có thể mất vài giây để đồng bộ. Vui lòng bấm <strong>Làm mới</strong> để kiểm tra.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Làm mới danh sách
            </button>
            <a
              href="#/upload-resource"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 transition shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Tải qua Google Form
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View (Section 15) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Tên tài nguyên</th>
                  <th className="py-3 px-4">Nguồn</th>
                  <th className="py-3 px-4">Bộ môn</th>
                  <th className="py-3 px-4">Khối</th>
                  <th className="py-3 px-4">Loại</th>
                  <th className="py-3 px-4">Năm học</th>
                  <th className="py-3 px-4">Cập nhật (VN)</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredResources.map((r, idx) => {
                  const statusInfo = getResourceStatusInfo(r.status);
                  const provider = detectResourceProvider(r.resource_url);
                  const pInfo = getProviderInfo(provider);

                  return (
                    <tr
                      key={r.id}
                      onClick={() => (window.location.hash = `#/resources/${r.id}`)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate hover:text-indigo-600">
                          {r.title}
                        </div>
                        {r.topic && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {r.topic}
                          </div>
                        )}
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${pInfo.badgeClass}`}
                          >
                            <span>{pInfo.iconPrefix}</span>
                            <span>{pInfo.label}</span>
                          </span>
                        </div>
                      </td>

                      {/* Nguồn tài nguyên (Section 14) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {r.source_type === 'google_form' ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200"
                            title={`Nộp qua Google Form${r.google_form_submission_id ? ` (Mã: ${r.google_form_submission_id})` : ''}`}
                          >
                            <FileSpreadsheet className="w-3 h-3 text-purple-600" />
                            Google Form
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                            Trực tiếp
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800">
                          {r.subject?.name || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        {r.grade?.name || '—'}
                        {r.class_name ? ` (${r.class_name})` : ''}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {r.resource_type}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {r.school_year || '—'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatVietnamDateTime(r.updated_at)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.badgeClass}`}
                          title={
                            r.status === 'submitted'
                              ? 'Tài nguyên đang chờ Tổ trưởng chuyên môn thẩm định.'
                              : statusInfo.label
                          }
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* Nút Xem tài nguyên (Section 12) */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenUrl(r, e)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="🔗 Mở liên kết tài nguyên"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {/* Nút Sao chép liên kết (Section 13) */}
                          <button
                            type="button"
                            onClick={(e) => handleCopyLink(r, e)}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                            title="📋 Sao chép liên kết"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Gửi duyệt nếu đang ở draft (Section 44) */}
                          {r.status === 'draft' && (
                            <button
                              type="button"
                              onClick={(e) => handleSubmitForApproval(r, e)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Gửi duyệt tài nguyên"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Chỉnh sửa nếu chưa approved */}
                          {r.status !== 'approved' && (
                            <a
                              href={`#/resources/${r.id}/edit`}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Chỉnh sửa tài nguyên"
                            >
                              <Edit3 className="w-4 h-4" />
                            </a>
                          )}

                          {/* Xóa nếu là Admin hoặc là draft/revision_required */}
                          {profile?.role === 'ADMIN' ? (
                            <>
                              {r.status !== 'archived' && (
                                <button
                                  type="button"
                                  onClick={(e) => handleArchive(r, e)}
                                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                                  title="Lưu trữ tài nguyên"
                                >
                                  <Archive className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(r);
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                title="Xóa tài nguyên (Quản trị viên)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (r.status === 'draft' || r.status === 'revision_required') ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(r);
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                              title="Xóa bản nháp"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : r.status !== 'archived' ? (
                            <button
                              type="button"
                              onClick={(e) => handleArchive(r, e)}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                              title="Lưu trữ tài nguyên"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Section 15 & 16) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {filteredResources.map((r) => {
              const statusInfo = getResourceStatusInfo(r.status);
              const provider = detectResourceProvider(r.resource_url);
              const pInfo = getProviderInfo(provider);

              return (
                <div
                  key={r.id}
                  onClick={() => (window.location.hash = `#/resources/${r.id}`)}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-indigo-300 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Header badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {r.resource_type}
                        </span>
                        {r.source_type === 'google_form' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <FileSpreadsheet className="w-2.5 h-2.5" />
                            Form
                          </span>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                        {statusInfo.label}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mb-2 line-clamp-2 hover:text-indigo-600">
                      {r.title}
                    </h3>

                    <div className="space-y-1 text-xs text-slate-600 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span>💻</span>
                        <span className="font-medium">{r.subject?.name || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>🎓</span>
                        <span>{r.grade?.name || '—'} {r.class_name ? `(${r.class_name})` : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>📅</span>
                        <span>{r.school_year || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span>🕐</span>
                        <span>Cập nhật: {formatVietnamDateTime(r.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleOpenUrl(r, e)}
                      className="flex-1 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      XEM TÀI NGUYÊN
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(r, e)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                      title="Sao chép liên kết"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Delete Dialog (Section 50) */}
      <ConfirmationDialog
        isOpen={Boolean(deleteTarget)}
        title="Xóa tài nguyên?"
        message={`Bạn có chắc chắn muốn xóa "${deleteTarget?.title}"? Thao tác này không thể hoàn tác.`}
        confirmText="Xóa tài nguyên"
        cancelText="Hủy"
        isDestructive={true}
        isLoading={submittingAction}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
