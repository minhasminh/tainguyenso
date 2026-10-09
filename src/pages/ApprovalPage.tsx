import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  BookOpen,
  Calendar,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { resourceService } from '../services/resourceService';
import { Resource } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getResourceStatusInfo, formatVietnamDateTime } from '../utils/formatters';
import { ApprovalActionDialog, WorkflowActionType } from '../components/resources/ApprovalActionDialog';

export function ApprovalPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'pending_leader' | 'pending_school' | 'revision' | 'approved'>('pending_leader');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // Action dialog modal
  const [activeResource, setActiveResource] = useState<Resource | null>(null);
  const [actionType, setActionType] = useState<WorkflowActionType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await resourceService.getResources(profile, {});
      setResources(res.data);
    } catch (err: any) {
      toast.error('Không thể tải danh sách tài nguyên phê duyệt: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [profile]);

  // Filter based on activeTab
  const filteredList = resources.filter((item) => {
    if (activeTab === 'pending_leader' && item.status !== 'submitted') return false;
    if (activeTab === 'pending_school' && item.status !== 'pending_school_approval') return false;
    if (activeTab === 'revision' && item.status !== 'revision_required') return false;
    if (activeTab === 'approved' && item.status !== 'approved') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchOwner = item.owner?.full_name?.toLowerCase().includes(q);
      const matchSubject = item.subject?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchOwner && !matchSubject) return false;
    }

    if (selectedDepartment !== 'all' && item.department_id !== selectedDepartment) {
      return false;
    }

    return true;
  });

  const handleOpenAction = (resource: Resource, type: WorkflowActionType) => {
    setActiveResource(resource);
    setActionType(type);
    setDialogOpen(true);
  };

  const handleConfirmAction = async (action: WorkflowActionType, comment: string) => {
    if (!activeResource || !profile) return;
    try {
      if (action === 'subject_leader_approve') {
        await resourceService.subjectLeaderApprove(activeResource.id, comment, profile);
        toast.success('Tổ trưởng đã duyệt và chuyển tài nguyên lên Ban Giám hiệu.');
      } else if (action === 'subject_leader_revision') {
        await resourceService.subjectLeaderRevision(activeResource.id, comment, profile);
        toast.success('Đã gửi yêu cầu chỉnh sửa đến giáo viên.');
      } else if (action === 'subject_leader_reject') {
        await resourceService.subjectLeaderReject(activeResource.id, comment, profile);
        toast.error('Đã từ chối phê duyệt tài nguyên.');
      } else if (action === 'school_approve') {
        await resourceService.schoolApprove(activeResource.id, comment, profile);
        toast.success('Ban Giám hiệu đã phê duyệt chính thức tài nguyên!');
      } else if (action === 'school_revision') {
        await resourceService.schoolRevision(activeResource.id, comment, profile);
        toast.success('Đã gửi yêu cầu hiệu chỉnh tới giáo viên.');
      } else if (action === 'school_reject') {
        await resourceService.schoolReject(activeResource.id, comment, profile);
        toast.error('Ban Giám hiệu đã từ chối phê duyệt.');
      }
      await fetchResources();
    } catch (e: any) {
      toast.error('Lỗi thực hiện phê duyệt: ' + e.message);
    }
  };

  const isLeader = profile?.role === 'SUBJECT_LEADER' || profile?.role === 'VICE_SUBJECT_LEADER' || profile?.role === 'ADMIN';
  const isSchoolAdmin = profile?.role === 'ADMIN' || profile?.role === 'SCHOOL_ADMIN' || profile?.role === 'VICE_PRINCIPAL';

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-sans pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            QUY TRÌNH THẨM ĐỊNH & PHÊ DUYỆT TÀI NGUYÊN
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quy trình 2 cấp: Tổ trưởng chuyên môn thẩm định → Ban Giám hiệu phê duyệt lưu hành
          </p>
        </div>

        <button
          onClick={fetchResources}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          Làm mới danh sách
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-3 gap-2 overflow-x-auto shadow-2xs">
        <button
          onClick={() => setActiveTab('pending_leader')}
          className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'pending_leader'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-500" />
          Chờ Tổ trưởng thẩm định
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
            {resources.filter((r) => r.status === 'submitted').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending_school')}
          className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'pending_school'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          Chờ BGH phê duyệt
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
            {resources.filter((r) => r.status === 'pending_school_approval').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('revision')}
          className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'revision'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-orange-500" />
          Cần chỉnh sửa
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-100 text-orange-800 font-bold">
            {resources.filter((r) => r.status === 'revision_required').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'approved'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Đã phê duyệt chính thức
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
            {resources.filter((r) => r.status === 'approved').length}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-b-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 -mt-6">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên học liệu, giáo viên nộp bài..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Resource List Cards */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Đang tải danh sách tài nguyên...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Không có tài nguyên nào trong mục này</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hiện tại không có học liệu nào cần xử lý với bộ lọc bạn đã chọn.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((res) => {
            const statusInfo = getResourceStatusInfo(res.status);

            return (
              <div
                key={res.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-300 transition shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.badgeClass}`}>
                      {statusInfo.label}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {res.resource_type || 'Học liệu'}
                    </span>
                    {res.grade?.name && (
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        Khối {res.grade.name}
                      </span>
                    )}
                    {res.subject?.name && (
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        Môn {res.subject.name}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    <a href={`#/resources/${res.id}`} className="hover:text-blue-600 transition">
                      {res.title}
                    </a>
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span>
                      Tác giả: <strong className="text-slate-800">{res.owner?.full_name || 'Giáo viên'}</strong>
                    </span>
                    <span>•</span>
                    <span>Tổ: <strong className="text-slate-700">{res.department?.name || 'Tổ chuyên môn'}</strong></span>
                    <span>•</span>
                    <span>Thời gian nộp: {formatVietnamDateTime(res.created_at)}</span>
                  </div>

                  {res.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {res.description}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 flex-wrap">
                  <a
                    href={`#/resources/${res.id}`}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  >
                    Xem chi tiết
                  </a>

                  {/* Tổ trưởng actions */}
                  {res.status === 'submitted' && isLeader && (
                    <>
                      <button
                        onClick={() => handleOpenAction(res, 'subject_leader_approve')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
                      >
                        Tổ trưởng Duyệt
                      </button>
                      <button
                        onClick={() => handleOpenAction(res, 'subject_leader_revision')}
                        className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
                      >
                        Yêu cầu sửa
                      </button>
                    </>
                  )}

                  {/* BGH actions */}
                  {res.status === 'pending_school_approval' && isSchoolAdmin && (
                    <>
                      <button
                        onClick={() => handleOpenAction(res, 'school_approve')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
                      >
                        BGH Phê duyệt
                      </button>
                      <button
                        onClick={() => handleOpenAction(res, 'school_revision')}
                        className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition shadow-2xs cursor-pointer"
                      >
                        Yêu cầu hiệu chỉnh
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Dialog */}
      {dialogOpen && activeResource && (
        <ApprovalActionDialog
          isOpen={dialogOpen}
          actionType={actionType}
          resource={activeResource}
          onClose={() => setDialogOpen(false)}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  );
}
