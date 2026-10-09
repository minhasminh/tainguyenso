import React, { useState } from 'react';
import { Resource, Profile } from '../../types';
import {
  ExternalLink,
  Copy,
  Check,
  Edit2,
  Trash2,
  FileText,
  Video,
  Presentation,
  Table,
  Image as ImageIcon,
  Sparkles,
  Link as LinkIcon,
  BookOpen,
  User,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';
import { formatVietnamDate } from '../../utils/formatters';
import { resourceService } from '../../services/resourceService';

interface ResourceCardGridProps {
  resources: Resource[];
  currentUser: Profile | null;
  onDelete?: (resource: Resource) => void;
}

export function ResourceCardGrid({ resources, currentUser, onDelete }: ResourceCardGridProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = async (e: React.MouseEvent, r: Resource) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(r.resource_url);
      setCopiedId(r.id);
      resourceService.logResourceCopyLink(r.id, currentUser, r.title);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore
    }
  };

  // Section 18: Standardized Status Badges
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#D1FAE5] text-[#047857]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            Đã phê duyệt
          </span>
        );
      case 'pending_school_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#B45309]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
            Chờ BGH duyệt
          </span>
        );
      case 'subject_leader_approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0E7FF] text-[#4338CA]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]"></span>
            Tổ trưởng duyệt
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DBEAFE] text-[#1D4ED8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
            Chờ thẩm định
          </span>
        );
      case 'revision_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
            Cần chỉnh sửa
          </span>
        );
      case 'rejected_by_subject_leader':
      case 'rejected_by_school':
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#B91C1C]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
            Từ chối
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#475569]">
            Bản nháp
          </span>
        );
    }
  };

  // Section 17: Automatic Resource Type Icon
  const getResourceTypeDetails = (type: string, url: string = '') => {
    const lower = (type + ' ' + url).toLowerCase();

    if (lower.includes('powerpoint') || lower.includes('ppt') || lower.includes('trình chiếu') || lower.includes('slide')) {
      return {
        icon: <Presentation className="w-5 h-5 text-amber-600" />,
        bg: 'bg-amber-50 text-amber-700',
        name: 'Bài trình chiếu',
      };
    }
    if (lower.includes('video') || lower.includes('youtube') || lower.includes('mp4')) {
      return {
        icon: <Video className="w-5 h-5 text-rose-600" />,
        bg: 'bg-rose-50 text-rose-700',
        name: 'Video',
      };
    }
    if (lower.includes('excel') || lower.includes('xls') || lower.includes('sheet') || lower.includes('bảng tính')) {
      return {
        icon: <Table className="w-5 h-5 text-emerald-600" />,
        bg: 'bg-emerald-50 text-emerald-700',
        name: 'Bảng tính',
      };
    }
    if (lower.includes('ảnh') || lower.includes('image') || lower.includes('png') || lower.includes('jpg')) {
      return {
        icon: <ImageIcon className="w-5 h-5 text-cyan-600" />,
        bg: 'bg-cyan-50 text-cyan-700',
        name: 'Hình ảnh',
      };
    }
    if (lower.includes('ai') || lower.includes('prompt')) {
      return {
        icon: <Sparkles className="w-5 h-5 text-purple-600" />,
        bg: 'bg-purple-50 text-purple-700',
        name: 'Tài nguyên AI',
      };
    }
    if (lower.includes('link') || lower.includes('web') || lower.includes('drive')) {
      return {
        icon: <LinkIcon className="w-5 h-5 text-blue-600" />,
        bg: 'bg-blue-50 text-blue-700',
        name: 'Liên kết',
      };
    }
    return {
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      bg: 'bg-blue-50 text-blue-700',
      name: type || 'Kế hoạch bài dạy',
    };
  };

  const canEdit = (r: Resource) => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (r.owner_id === currentUser.id) {
      return ['draft', 'revision_required', 'rejected_by_subject_leader', 'rejected_by_school'].includes(r.status);
    }
    return false;
  };

  const canDelete = (r: Resource) => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (r.owner_id === currentUser.id) {
      return ['draft', 'revision_required'].includes(r.status);
    }
    return false;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {resources.map((r) => {
        const typeInfo = getResourceTypeDetails(r.resource_type, r.resource_url);
        const hasEditPermission = canEdit(r);
        const hasDeletePermission = canDelete(r);

        return (
          <div
            key={r.id}
            onClick={() => {
              window.location.hash = `#/resources/${r.id}`;
            }}
            className="group relative bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
          >
            {/* Top Row: Icon Container & Status Badge */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                  {typeInfo.icon}
                </div>
                <div className="shrink-0">{renderStatusBadge(r.status)}</div>
              </div>

              {/* Title & Description */}
              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm sm:text-base line-clamp-2 leading-snug mb-1">
                {r.title}
              </h3>

              {r.topic && (
                <p className="text-xs text-slate-500 line-clamp-1 mb-2 font-medium">
                  {r.topic}
                </p>
              )}

              {/* Meta Tags */}
              <div className="flex items-center gap-1.5 flex-wrap my-3">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                  {r.subject?.name || 'Môn học'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                  {r.grade?.name || 'Khối'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium">
                  {r.resource_type}
                </span>
              </div>
            </div>

            {/* Bottom Meta & Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate max-w-[120px] font-medium">
                  {r.owner?.full_name || 'Giáo viên'}
                </span>
                <span>·</span>
                <span className="shrink-0 text-slate-400">
                  {formatVietnamDate(r.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleCopyLink(e, r)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                  title="Sao chép liên kết"
                >
                  {copiedId === r.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <div className="flex items-center gap-1 text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform text-xs">
                  <span>Chi tiết</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
