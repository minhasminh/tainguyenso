import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { resourceTypeService } from '../services/resourceTypeService';
import { useToast } from '../hooks/useToast';
import { ResourceType } from '../types';
import {
  Layers,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FileText,
  AlertTriangle,
  X,
  Check,
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Sparkles,
  Presentation,
  Video,
  Music,
  FileSpreadsheet,
  Cpu,
  HelpCircle,
} from 'lucide-react';
import { translateSupabaseError } from '../utils/errorHandling';

// Helper icon by resource type name or code
function getTypeIcon(name: string, code?: string | null) {
  const lower = (name + ' ' + (code || '')).toLowerCase();
  if (lower.includes('powerpoint') || lower.includes('ppt') || lower.includes('trình chiếu')) {
    return <Presentation className="w-5 h-5 text-amber-500" />;
  }
  if (lower.includes('video') || lower.includes('clip')) {
    return <Video className="w-5 h-5 text-rose-500" />;
  }
  if (lower.includes('âm thanh') || lower.includes('audio') || lower.includes('mp3')) {
    return <Music className="w-5 h-5 text-purple-500" />;
  }
  if (lower.includes('excel') || lower.includes('bảng tính')) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
  }
  if (lower.includes('phần mềm') || lower.includes('mô phỏng') || lower.includes('software')) {
    return <Cpu className="w-5 h-5 text-cyan-500" />;
  }
  return <FileText className="w-5 h-5 text-indigo-500" />;
}

export function AdminResourceTypesPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ResourceType | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Xóa
  const [typeToDelete, setTypeToDelete] = useState<ResourceType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggling state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const canManage = profile?.role === 'ADMIN' || profile?.role === 'SCHOOL_ADMIN' || profile?.role === 'VICE_PRINCIPAL';

  const loadData = async () => {
    setLoading(true);
    try {
      // Pass includeInactive = true to get all types for management
      const data = await resourceTypeService.getResourceTypes(profile, true);
      setResourceTypes(data);
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể tải danh sách loại tài nguyên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  // Open modal create
  const handleOpenCreateModal = () => {
    setEditingType(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  // Open modal edit
  const handleOpenEditModal = (rt: ResourceType) => {
    setEditingType(rt);
    setFormName(rt.name);
    setFormCode(rt.code || '');
    setFormDescription(rt.description || '');
    setFormIsActive(rt.is_active);
    setIsModalOpen(true);
  };

  // Quick template suggestion
  const handleApplyTemplate = (name: string, code: string, desc: string) => {
    setFormName(name);
    setFormCode(code);
    setFormDescription(desc);
  };

  // Handle submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập tên loại tài nguyên');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingType) {
        await resourceTypeService.updateResourceType(
          editingType.id,
          {
            name: trimmed,
            code: formCode.trim() || null,
            description: formDescription.trim() || null,
            is_active: formIsActive,
          },
          profile
        );
        toast.success(`Đã cập nhật loại tài nguyên "${trimmed}" thành công!`);
      } else {
        await resourceTypeService.createResourceType(
          {
            name: trimmed,
            code: formCode.trim() || null,
            description: formDescription.trim() || null,
            is_active: formIsActive,
          },
          profile
        );
        toast.success(`Đã thêm loại tài nguyên "${trimmed}" vào hệ thống thành công!`);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể lưu loại tài nguyên');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active state
  const handleToggleActive = async (rt: ResourceType) => {
    setTogglingId(rt.id);
    try {
      await resourceTypeService.toggleResourceTypeActive(rt.id, profile);
      toast.success(
        rt.is_active
          ? `Đã tạm ngưng áp dụng loại tài nguyên "${rt.name}"`
          : `Đã kích hoạt áp dụng loại tài nguyên "${rt.name}"`
      );
      await loadData();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể thay đổi trạng thái kích hoạt');
    } finally {
      setTogglingId(null);
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!typeToDelete) return;

    setIsDeleting(true);
    try {
      await resourceTypeService.deleteResourceType(typeToDelete.id, profile);
      toast.success(`Đã xóa loại tài nguyên "${typeToDelete.name}" thành công!`);
      setTypeToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể xóa loại tài nguyên');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return resourceTypes.filter((rt) => {
      // Status filter
      if (statusFilter === 'active' && !rt.is_active) return false;
      if (statusFilter === 'inactive' && rt.is_active) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = rt.name.toLowerCase().includes(q);
        const matchCode = (rt.code || '').toLowerCase().includes(q);
        const matchDesc = (rt.description || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDesc) return false;
      }

      return true;
    });
  }, [resourceTypes, statusFilter, searchQuery]);

  // KPIs
  const totalCount = resourceTypes.length;
  const activeCount = resourceTypes.filter((rt) => rt.is_active).length;
  const inactiveCount = totalCount - activeCount;
  const totalResources = resourceTypes.reduce((sum, rt) => sum + (rt.resource_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản Lý Loại Tài Nguyên Số
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {totalCount} danh mục
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Thiết lập danh mục định dạng học liệu số (Kế hoạch bài dạy, Bài giảng điện tử, Đề kiểm tra, Video, ...) theo chuẩn GDPT 2018 tại Trường TH&THCS Nguyễn Đình Anh
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Loại Tài Nguyên Mới</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Tổng danh mục</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Loại tài nguyên chuẩn</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-100 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-emerald-800 font-medium">Đang kích hoạt</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Giáo viên được tải lên</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Tạm ngừng áp dụng</p>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-700 mt-1">{inactiveCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Ẩn khỏi form tải lên</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-indigo-100 bg-indigo-50/20 shadow-xs">
          <p className="text-xs text-indigo-800 font-medium">Tổng học liệu gắn liền</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{totalResources}</p>
          <p className="text-[11px] text-indigo-600 mt-0.5">Tài nguyên đã phân loại</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên loại học liệu, mã viết tắt hoặc mô tả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Tab buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đang dùng ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tạm tắt ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Main Content List / Cards */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500 text-xs">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
          <span>Đang tải danh sách loại tài nguyên...</span>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            Không tìm thấy loại tài nguyên phù hợp
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Thử thay đổi từ khóa tìm kiếm hoặc bấm nút bên dưới để tạo loại tài nguyên mới.
          </p>
          {canManage && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Loại Tài Nguyên Mới</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((rt) => {
            const isActive = rt.is_active;
            const resCount = rt.resource_count || 0;

            return (
              <div
                key={rt.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition group relative ${
                  isActive
                    ? 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                    : 'border-slate-200/60 bg-slate-50/50 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/80 group-hover:scale-105 transition-transform">
                        {getTypeIcon(rt.name, rt.code)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">
                            {rt.name}
                          </h3>
                          {rt.code && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              {rt.code}
                            </span>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Đang kích hoạt</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>Tạm ngừng</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(rt)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="Chỉnh sửa loại tài nguyên"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTypeToDelete(rt)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Xóa loại tài nguyên"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px] mb-3">
                    {rt.description || 'Chưa có mô tả chi tiết cho loại học liệu này.'}
                  </p>

                  {/* Metadata Stats Box */}
                  <div className="p-3 bg-slate-50/80 rounded-xl space-y-1.5 text-xs text-slate-600 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Số tài nguyên gắn liền:</span>
                      <span className="font-bold text-indigo-600">
                        {resCount} học liệu
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Mã định danh (ID):</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {rt.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={`#/resources?types=${encodeURIComponent(rt.name)}`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                  >
                    <span>Xem tài nguyên ({resCount})</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {canManage && (
                    <button
                      onClick={() => handleToggleActive(rt)}
                      disabled={togglingId === rt.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                        isActive
                          ? 'bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                      title={isActive ? 'Bấm để tắt kích hoạt' : 'Bấm để kích hoạt lại'}
                    >
                      {togglingId === rt.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isActive ? (
                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                      )}
                      <span>{isActive ? 'Đang bật' : 'Đã tắt'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Thêm / Sửa Loại Tài Nguyên */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingType ? 'Chỉnh Sửa Loại Tài Nguyên' : 'Thêm Loại Tài Nguyên Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Trường TH&THCS Nguyễn Đình Anh
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Quick Template suggestions (only on create) */}
              {!editingType && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Gợi ý mẫu học liệu số phổ biến:</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyTemplate(
                          'Sơ đồ tư duy',
                          'MINDMAP',
                          'Sơ đồ tư duy tóm tắt nội dung bài học (XMind, Mindmeister, Coggle)'
                        )
                      }
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[11px] font-medium transition cursor-pointer"
                    >
                      Sơ đồ tư duy (MINDMAP)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyTemplate(
                          'Trò chơi học tập',
                          'GAME',
                          'Trò chơi giáo dục tương tác (Kahoot, Quizizz, Wordwall, Blooket)'
                        )
                      }
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[11px] font-medium transition cursor-pointer"
                    >
                      Trò chơi học tập (GAME)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyTemplate(
                          'Thí nghiệm ảo',
                          'LAB_SIM',
                          'Mô phỏng thí nghiệm thực hành ảo (PhET Interactive, GeoGebra)'
                        )
                      }
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[11px] font-medium transition cursor-pointer"
                    >
                      Thí nghiệm ảo (LAB_SIM)
                    </button>
                  </div>
                </div>
              )}

              {/* Tên loại tài nguyên */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên loại tài nguyên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Kế hoạch bài dạy, Giáo án điện tử, Bài tập tương tác..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Mã viết tắt (Code) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mã viết tắt (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: KHBD, PPT, VIDEO, MINDMAP..."
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition uppercase"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Dùng để hiển thị badge ngắn gọn và đồng bộ dữ liệu chuẩn
                </p>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mô tả & Hướng dẫn phân loại
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả phạm vi áp dụng, tiêu chí hoặc công cụ khuyến nghị sử dụng..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition resize-none"
                />
              </div>

              {/* Is Active Toggle */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/60 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">
                      Kích hoạt cho phép giáo viên tải lên
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Nếu bỏ chọn, danh mục này sẽ tạm ẩn khỏi form tạo tài nguyên mới của giáo viên nhưng vẫn giữ nguyên dữ liệu các bài đã đăng trước đó.
                    </p>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingType ? 'Cập nhật' : 'Tạo Loại Tài Nguyên'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận xóa Loại Tài Nguyên */}
      {typeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Xác nhận xóa loại tài nguyên
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa loại tài nguyên{' '}
              <strong className="text-slate-900">"{typeToDelete.name}"</strong> khỏi hệ thống?
            </p>

            {typeToDelete.resource_count && typeToDelete.resource_count > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 mb-4 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Cảnh báo an toàn dữ liệu:</strong> Danh mục này đang có{' '}
                  <strong>{typeToDelete.resource_count} học liệu</strong> gắn liền. Hệ thống sẽ chặn xóa để tránh làm sai lệch dữ liệu học liệu. Bạn có thể chọn{' '}
                  <strong>"Tắt kích hoạt"</strong> để không cho đăng mới mà vẫn giữ nguyên học liệu cũ.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 mb-4">
                Loại tài nguyên này hiện chưa có học liệu gắn liền, có thể an toàn xóa khỏi hệ thống.
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setTypeToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
