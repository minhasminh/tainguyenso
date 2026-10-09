import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { resourceService } from '../services/resourceService';
import { realtimeService } from '../services/realtimeService';
import { useToast } from '../hooks/useToast';
import { Resource } from '../types';
import {
  formatVietnamDateTime,
  getResourceStatusInfo,
  detectResourceProvider,
  getProviderInfo,
} from '../utils/formatters';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { ResourceQrCard } from '../components/resources/ResourceQrCard';
import { ResourceHistoryTimeline } from '../components/resources/ResourceHistoryTimeline';
import {
  ApprovalActionDialog,
  WorkflowActionType,
} from '../components/resources/ApprovalActionDialog';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Edit3,
  Trash2,
  Send,
  Building,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
  Archive,
  Loader2,
  Sparkles,
  Layers,
  History,
  AlertTriangle,
  QrCode,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface ResourceDetailPageProps {
  id: string;
}

export function ResourceDetailPage({ id }: ResourceDetailPageProps) {
  const { profile } = useAuth();
  const toast = useToast();

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  // Workflow Dialog state
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [selectedWorkflowAction, setSelectedWorkflowAction] = useState<WorkflowActionType | null>(null);

  const loadData = async () => {
    try {
      const data = await resourceService.getResourceById(id, profile);
      setResource(data);
      // Log view action
      resourceService.logResourceView(id, profile, data.title);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải chi tiết tài nguyên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();

    const unsubscribe = realtimeService.subscribeToResources((payload) => {
      if (payload.newRecord?.id === id || payload.oldRecord?.id === id) {
        loadData();
      }
    });

    return unsubscribe;
  }, [id, profile]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <span className="text-xs">Đang tải thông tin tài nguyên...</span>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="py-16 text-center">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Không tìm thấy tài nguyên
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Tài nguyên có thể đã bị xóa hoặc bạn không có quyền xem theo chính sách bảo mật RLS.
        </p>
        <a
          href="#/resources"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </a>
      </div>
    );
  }

  const isOwner = resource.owner_id === profile?.id;
  const isAdmin = profile?.role === 'ADMIN';
  const isSchoolAdmin = profile?.role === 'SCHOOL_ADMIN' || profile?.role === 'VICE_PRINCIPAL';
  const isSubjectLeader =
    (profile?.role === 'SUBJECT_LEADER' || profile?.role === 'VICE_SUBJECT_LEADER') &&
    (profile?.department_id === resource.department_id || isAdmin);

  const canEdit =
    (isOwner &&
      (resource.status === 'draft' || resource.status === 'revision_required')) ||
    isAdmin;

  const canDelete =
    (isOwner &&
      (resource.status === 'draft' || resource.status === 'revision_required')) ||
    isAdmin;

  // Workflow actions permissions
  const canTeacherSubmit =
    isOwner && (resource.status === 'draft' || resource.status === 'revision_required');

  const canSubjectLeaderReview =
    (isSubjectLeader || isAdmin || isSchoolAdmin) && resource.status === 'submitted';

  const canSchoolAdminReview =
    (isSchoolAdmin || isAdmin) && resource.status === 'pending_school_approval';

  const statusInfo = getResourceStatusInfo(resource.status);
  const provider = detectResourceProvider(resource.resource_url);
  const pInfo = getProviderInfo(provider);

  const handleOpenUrl = () => {
    window.open(resource.resource_url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(resource.resource_url);
      resourceService.logResourceCopyLink(resource.id, profile, resource.title);
      toast.success('Đã sao chép liên kết tài nguyên.');
    } catch {
      toast.error('Không thể truy cập clipboard.');
    }
  };

  const handleDeleteConfirm = async () => {
    setSubmittingAction(true);
    try {
      await resourceService.deleteResource(resource.id, profile);
      toast.success('Đã xóa tài nguyên thành công.');
      window.location.hash = '#/resources';
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa tài nguyên.');
    } finally {
      setSubmittingAction(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleOpenWorkflowDialog = (action: WorkflowActionType) => {
    setSelectedWorkflowAction(action);
    setWorkflowDialogOpen(true);
  };

  const handleConfirmWorkflowAction = async (action: WorkflowActionType, comment: string) => {
    if (!resource || !profile) return;
    try {
      let updated: Resource | null = null;

      switch (action) {
        case 'submit':
          updated = await resourceService.submitResource(resource.id, comment, profile);
          toast.success('Đã gửi tài nguyên tới Tổ trưởng thẩm định.');
          break;
        case 'subject_leader_approve':
          updated = await resourceService.subjectLeaderApprove(resource.id, comment, profile);
          toast.success('Tổ trưởng đã duyệt thẩm định và chuyển lên Ban Giám hiệu.');
          break;
        case 'subject_leader_revision':
          updated = await resourceService.subjectLeaderRevision(resource.id, comment, profile);
          toast.success('Đã gửi yêu cầu chỉnh sửa tới giáo viên.');
          break;
        case 'subject_leader_reject':
          updated = await resourceService.subjectLeaderReject(resource.id, comment, profile);
          toast.error('Đã từ chối duyệt tài nguyên.');
          break;
        case 'school_approve':
          updated = await resourceService.schoolApprove(resource.id, comment, profile);
          toast.success('Ban Giám hiệu đã phê duyệt chính thức tài nguyên.');
          break;
        case 'school_revision':
          updated = await resourceService.schoolRevision(resource.id, comment, profile);
          toast.success('Đã gửi yêu cầu điều chỉnh hoàn thiện tới giáo viên.');
          break;
        case 'school_reject':
          updated = await resourceService.schoolReject(resource.id, comment, profile);
          toast.error('Ban Giám hiệu từ chối phê duyệt tài nguyên.');
          break;
      }

      if (updated) {
        setResource(updated);
      }
    } catch (err: any) {
      toast.error(err.message || 'Thao tác không thành công.');
      throw err;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <a
            href="#/resources"
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}
              >
                {statusInfo.label}
              </span>
              {resource.source_type === 'google_form' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <FileSpreadsheet className="w-3 h-3" /> Nguồn Google Form
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Nhập trực tiếp
                </span>
              )}
              <span className="text-xs text-slate-400 font-mono">
                {resource.public_token ? `Mã: ${resource.public_token}` : ''}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1 line-clamp-1">
              {resource.title}
            </h1>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <a
              href={`#/resources/${resource.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Sửa tài nguyên
            </a>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-rose-200 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenUrl}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Mở tài nguyên
          </button>
        </div>
      </div>

      {/* Warning/Alert Banner for Revision or Rejection */}
      {resource.rejection_reason && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3.5 text-amber-900 animate-in fade-in duration-200">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-amber-700">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xs leading-relaxed space-y-1">
            <h4 className="font-bold text-amber-950">
              {resource.status === 'revision_required'
                ? 'Yêu cầu hoàn thiện, chỉnh sửa tài nguyên:'
                : 'Lý do từ chối phê duyệt:'}
            </h4>
            <p className="text-amber-800 whitespace-pre-line font-medium">
              {resource.rejection_reason}
            </p>
          </div>
        </div>
      )}

      {/* 4-Step Approval Workflow Timeline (Section 24) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tiến trình thẩm định & phê duyệt chuyên môn (4 Bước)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quy chuẩn kiểm duyệt học liệu số 2 cấp tại Trường TH&THCS Nguyễn Đình Anh
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
            {statusInfo.label}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
          {/* Step 1: Giáo viên nộp bài */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              resource.status !== 'draft'
                ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                {resource.status === 'draft' ? 'Đang soạn' : 'Đã nộp bài'}
              </span>
            </div>
            <div className="font-bold text-xs">Giáo viên nộp bài</div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {resource.owner?.full_name || 'Tác giả bài dạy'}
            </div>
          </div>

          {/* Step 2: Tổ trưởng thẩm định */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              ['subject_leader_approved', 'pending_school_approval', 'approved'].includes(resource.status)
                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                : resource.status === 'submitted'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-100 text-amber-900'
                : 'bg-slate-50/60 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  ['subject_leader_approved', 'pending_school_approval', 'approved'].includes(resource.status)
                    ? 'bg-indigo-600 text-white'
                    : resource.status === 'submitted'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-300 text-slate-600'
                }`}
              >
                2
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  ['subject_leader_approved', 'pending_school_approval', 'approved'].includes(resource.status)
                    ? 'text-indigo-600'
                    : resource.status === 'submitted'
                    ? 'text-amber-600'
                    : 'text-slate-400'
                }`}
              >
                {resource.status === 'submitted'
                  ? 'Đang thẩm định'
                  : ['subject_leader_approved', 'pending_school_approval', 'approved'].includes(resource.status)
                  ? 'Đã thông qua'
                  : 'Chờ tiếp nhận'}
              </span>
            </div>
            <div className="font-bold text-xs">Tổ trưởng chuyên môn</div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              Thẩm định chuẩn GDPT 2018
            </div>
          </div>

          {/* Step 3: Ban Giám hiệu phê duyệt */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              resource.status === 'approved'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : resource.status === 'pending_school_approval'
                ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-100 text-purple-900'
                : 'bg-slate-50/60 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  resource.status === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : resource.status === 'pending_school_approval'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-300 text-slate-600'
                }`}
              >
                3
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  resource.status === 'approved'
                    ? 'text-emerald-600'
                    : resource.status === 'pending_school_approval'
                    ? 'text-purple-600'
                    : 'text-slate-400'
                }`}
              >
                {resource.status === 'approved'
                  ? 'Đã phê duyệt'
                  : resource.status === 'pending_school_approval'
                  ? 'BGH đang xét'
                  : 'Chờ cấp trường'}
              </span>
            </div>
            <div className="font-bold text-xs">Ban Giám hiệu</div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              Hiệu trưởng / Phó hiệu trưởng
            </div>
          </div>

          {/* Step 4: Công khai & Mã QR */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              resource.status === 'approved'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-slate-50/60 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  resource.status === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-300 text-slate-600'
                }`}
              >
                4
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  resource.status === 'approved' ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {resource.status === 'approved' ? 'Đã kích hoạt' : 'Chưa công khai'}
              </span>
            </div>
            <div className="font-bold text-xs">Kho dùng chung & QR Code</div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              Tra cứu & in mã dán giáo án
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Action Bar (Giáo viên -> Tổ trưởng -> BGH) */}
      {(canTeacherSubmit || canSubjectLeaderReview || canSchoolAdminReview) && (
        <div className="p-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/90 to-purple-50/90 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Thao tác Quy trình Phê duyệt Chuyên môn
              </h4>
              <p className="text-xs text-slate-600">
                {canTeacherSubmit && 'Tài nguyên sẵn sàng để gửi thẩm định lên Tổ trưởng chuyên môn.'}
                {canSubjectLeaderReview && 'Tổ trưởng chuyên môn thẩm định tính chuẩn xác và phù hợp GDPT 2018.'}
                {canSchoolAdminReview && 'Ban Giám hiệu xem xét phê duyệt đưa vào kho bài giảng dùng chung toàn trường.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-end">
            {/* Teacher Submit */}
            {canTeacherSubmit && (
              <button
                type="button"
                onClick={() => handleOpenWorkflowDialog('submit')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi duyệt tài nguyên</span>
              </button>
            )}

            {/* Subject Leader Review */}
            {canSubjectLeaderReview && (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenWorkflowDialog('subject_leader_revision')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Yêu cầu sửa</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenWorkflowDialog('subject_leader_reject')}
                  className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Từ chối</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenWorkflowDialog('subject_leader_approve')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Duyệt chuyển BGH</span>
                </button>
              </>
            )}

            {/* School Admin Review */}
            {canSchoolAdminReview && (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenWorkflowDialog('school_revision')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Yêu cầu sửa</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenWorkflowDialog('school_reject')}
                  className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Từ chối</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenWorkflowDialog('school_approve')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Phê duyệt BGH</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Content Details or History Tab */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Tabs Header */}
            <div className="flex items-center border-b border-slate-100 bg-slate-50/60 px-5 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'info'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                Thông tin học liệu số
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'history'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                Lịch sử & Phê duyệt (Timeline)
              </button>
            </div>

            {/* Tab 1: Info Body */}
            {activeTab === 'info' ? (
              <div className="p-5 sm:p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${pInfo.badgeClass}`}
                    >
                      <span>{pInfo.iconPrefix}</span>
                      <span>{pInfo.label}</span>
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      • {resource.resource_type}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 leading-snug">
                    {resource.title}
                  </h2>

                  {resource.topic && (
                    <div className="mt-2 text-xs font-semibold text-indigo-600 flex items-center gap-1.5">
                      <span>Chủ đề / Bài học:</span>
                      <span className="text-slate-800 font-normal">{resource.topic}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Mô tả tài nguyên
                  </h3>
                  <div className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-4 rounded-xl border border-slate-100 whitespace-pre-line font-sans">
                    {resource.description || 'Chưa có thông tin mô tả chi tiết.'}
                  </div>
                </div>

                {/* URL Container Box */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Đường dẫn tài nguyên số
                  </h3>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="overflow-hidden flex-1">
                      <div className="font-mono text-xs text-indigo-600 truncate">
                        {resource.resource_url}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Nguồn lưu trữ: {pInfo.label}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1 transition shadow-2xs cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Sao chép
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenUrl}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Mở liên kết
                      </button>
                    </div>
                  </div>
                </div>

                {/* Detailed Properties Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px]">Bộ môn:</span>
                      <span className="font-semibold text-slate-900">{resource.subject?.name || '—'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px]">Khối lớp:</span>
                      <span className="font-semibold text-slate-900">
                        {resource.grade?.name || '—'} {resource.class_name ? `(Lớp ${resource.class_name})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px]">Năm học:</span>
                      <span className="font-semibold text-slate-900">{resource.school_year || '—'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tệp gốc đính kèm:</span>
                      <span className="font-semibold text-slate-900 font-mono text-[11px] truncate max-w-[160px] block">
                        {resource.file_name || 'Không có tệp đính kèm'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Google Form Source Details Card */}
                {resource.source_type === 'google_form' && (
                  <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                        Thông tin đồng bộ từ Google Form
                      </span>
                      <span className="text-[10px] font-mono text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded">
                        Mã nộp: {resource.google_form_submission_id || 'Chưa ghi nhận'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-purple-950">
                      <div>
                        <span className="text-purple-600/80 text-[11px] block">Người gửi biểu mẫu:</span>
                        <span className="font-semibold">{resource.source_metadata?.teacher_name || resource.owner?.full_name}</span>
                        <span className="text-[11px] text-purple-700 block">({resource.source_metadata?.teacher_email || resource.owner?.email})</span>
                      </div>
                      <div>
                        <span className="text-purple-600/80 text-[11px] block">Thời gian tiếp nhận:</span>
                        <span className="font-semibold">{formatVietnamDateTime(resource.synced_at || resource.created_at)}</span>
                      </div>
                    </div>
                    {resource.google_drive_file_id && (
                      <div className="pt-2 border-t border-purple-200/60 text-[11px] text-purple-800 flex items-center gap-2">
                        <span>Google Drive ID:</span>
                        <span className="font-mono bg-white/80 px-1.5 py-0.5 rounded border border-purple-200">{resource.google_drive_file_id}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Tab 2: Timeline Body */
              <div className="p-5 sm:p-6">
                <ResourceHistoryTimeline resourceId={resource.id} callerProfile={profile} />
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3): QR Code Card & Author */}
        <div className="space-y-6">
          {/* Section 5: QR CODE DISPLAY CARD */}
          <ResourceQrCard resource={resource} />

          {/* Author Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Tác giả tài nguyên
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
                {resource.owner?.full_name?.charAt(0) || 'G'}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                  {resource.owner?.full_name}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {resource.owner?.email}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Tổ chuyên môn:</span>
                <span className="font-medium text-slate-900">{resource.department?.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-400">Vai trò:</span>
                <span className="font-medium text-slate-900">{resource.owner?.role || 'TEACHER'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        title={isAdmin ? "Xóa vĩnh viễn tài nguyên (Quản trị viên)?" : "Xóa tài nguyên?"}
        message={
          isAdmin
            ? `Bạn có chắc chắn muốn xóa vĩnh viễn tài nguyên "${resource.title}"? Với quyền Quản trị viên (ADMIN), tài nguyên này sẽ bị gỡ bỏ hoàn toàn khỏi hệ thống nhà trường và không thể hoàn tác.`
            : `Bạn có chắc chắn muốn xóa "${resource.title}"? Thao tác này không thể hoàn tác.`
        }
        confirmText="Xác nhận xóa tài nguyên"
        cancelText="Hủy"
        isDestructive={true}
        isLoading={submittingAction}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      {/* Workflow Action Modal */}
      <ApprovalActionDialog
        isOpen={workflowDialogOpen}
        actionType={selectedWorkflowAction}
        resource={resource}
        onClose={() => setWorkflowDialogOpen(false)}
        onConfirm={handleConfirmWorkflowAction}
      />
    </div>
  );
}
