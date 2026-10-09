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
  Table as TableIcon,
  Image as ImageIcon,
  Sparkles,
  Link as LinkIcon,
  User,
  ArrowRight,
} from 'lucide-react';
import { formatVietnamDate } from '../../utils/formatters';
import { resourceService } from '../../services/resourceService';

interface ResourceTableProps {
  resources: Resource[];
  currentUser: Profile | null;
  startIndex: number;
  onDelete?: (resource: Resource) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
}

export function ResourceTable({
  resources,
  currentUser,
  startIndex,
  onDelete,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
}: ResourceTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isAdmin = currentUser?.role === 'ADMIN';

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
            Đã duyệt
          </span>
        );
      case 'pending_school_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#B45309]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
            Chờ BGH
          </span>
        );
      case 'subject_leader_approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E0E7FF] text-[#4338CA]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]"></span>
            Tổ duyệt
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DBEAFE] text-[#1D4ED8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]"></span>
            Chờ duyệt
          </span>
        );
      case 'revision_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#D97706]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
            Cần sửa
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

  const getTypeIcon = (type: string, url: string = '') => {
    const lower = (type + ' ' + url).toLowerCase();
    if (lower.includes('powerpoint') || lower.includes('ppt') || lower.includes('slide')) {
      return <Presentation className="w-4 h-4 text-amber-600" />;
    }
    if (lower.includes('video') || lower.includes('youtube')) {
      return <Video className="w-4 h-4 text-rose-600" />;
    }
    if (lower.includes('excel') || lower.includes('sheet') || lower.includes('bảng tính')) {
      return <TableIcon className="w-4 h-4 text-emerald-600" />;
    }
    if (lower.includes('ảnh') || lower.includes('image')) {
      return <ImageIcon className="w-4 h-4 text-cyan-600" />;
    }
    if (lower.includes('ai') || lower.includes('prompt')) {
      return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
    if (lower.includes('link') || lower.includes('web') || lower.includes('drive')) {
      return <LinkIcon className="w-4 h-4 text-blue-600" />;
    }
    return <FileText className="w-4 h-4 text-blue-600" />;
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
    <div>
      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                {onToggleSelect && (
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={resources.length > 0 && selectedIds.length === resources.length}
                      onChange={onToggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </th>
                )}
                <th className="py-3.5 px-4 font-semibold text-slate-700">Tên tài nguyên</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Loại</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Môn học</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Khối</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Người nộp</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Trạng thái</th>
                <th className="py-3.5 px-4 font-semibold text-slate-700">Ngày</th>
                <th className="py-3.5 px-4 text-right font-semibold text-slate-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {resources.map((r) => {
                const isSelected = selectedIds.includes(r.id);
                const hasEdit = canEdit(r);
                const hasDel = canDelete(r);

                return (
                  <tr
                    key={r.id}
                    onClick={() => {
                      window.location.hash = `#/resources/${r.id}`;
                    }}
                    className={`group hover:bg-blue-50/40 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/70' : ''
                    }`}
                  >
                    {onToggleSelect && (
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(r.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                    )}

                    {/* Name */}
                    <td className="py-3.5 px-4 min-w-[220px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          {getTypeIcon(r.resource_type, r.resource_url)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {r.title}
                          </div>
                          {r.topic && (
                            <div className="text-[11px] text-slate-400 line-clamp-1">
                              {r.topic}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-xs">
                      {r.resource_type}
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        {r.subject?.name || 'Môn học'}
                      </span>
                    </td>

                    {/* Grade */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600">
                      {r.grade?.name || 'Khối'}
                    </td>

                    {/* Author */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.owner?.full_name || 'Giáo viên'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(r.status)}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                      {formatVietnamDate(r.created_at)}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(e, r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                          title="Sao chép liên kết"
                        >
                          {copiedId === r.id ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        <a
                          href={`#/resources/${r.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                          title="Xem chi tiết"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Fallback (Section 42) */}
      <div className="md:hidden space-y-3">
        {resources.map((r) => {
          return (
            <div
              key={r.id}
              onClick={() => {
                window.location.hash = `#/resources/${r.id}`;
              }}
              className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-slate-900 text-sm line-clamp-2">
                  {r.title}
                </h4>
                <div className="shrink-0">{renderStatusBadge(r.status)}</div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{r.subject?.name || 'Môn học'}</span>
                <span>·</span>
                <span>{r.grade?.name || 'Khối'}</span>
                <span>·</span>
                <span className="text-blue-600 font-medium">{r.resource_type}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[130px] font-medium">{r.owner?.full_name}</span>
                  <span>·</span>
                  <span>{formatVietnamDate(r.created_at)}</span>
                </div>

                <a
                  href={`#/resources/${r.id}`}
                  className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Xem →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
