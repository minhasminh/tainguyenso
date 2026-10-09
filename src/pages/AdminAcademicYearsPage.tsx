import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { academicYearService } from '../services/academicYearService';
import { useToast } from '../hooks/useToast';
import { AcademicYear } from '../types';
import {
  CalendarDays,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FileText,
  AlertTriangle,
  X,
  Check,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { translateSupabaseError } from '../utils/errorHandling';

export function AdminAcademicYearsPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formName, setFormName] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsActive, setFormIsActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Xóa
  const [yearToDelete, setYearToDelete] = useState<AcademicYear | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Set active state
  const [settingActiveId, setSettingActiveId] = useState<string | null>(null);

  const canManage = profile?.role === 'ADMIN' || profile?.role === 'SCHOOL_ADMIN' || profile?.role === 'VICE_PRINCIPAL';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await academicYearService.getAcademicYears(profile);
      setAcademicYears(data);
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể tải danh sách năm học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  // Open modal create
  const handleOpenCreateModal = () => {
    setEditingYear(null);

    // Auto calculate suggestion for next year
    const nowYear = new Date().getFullYear();
    const nextYear = nowYear + 1;
    const defaultName = `${nowYear}–${nextYear}`;

    setFormName(defaultName);
    setFormStartDate(`${nowYear}-08-01`);
    setFormEndDate(`${nextYear}-07-31`);
    setFormIsActive(false);
    setIsModalOpen(true);
  };

  // Open modal edit
  const handleOpenEditModal = (ay: AcademicYear) => {
    setEditingYear(ay);
    setFormName(ay.name);
    setFormStartDate(ay.start_date || '');
    setFormEndDate(ay.end_date || '');
    setFormIsActive(ay.is_active);
    setIsModalOpen(true);
  };

  // Quick name helper
  const handleSetYearSuggestion = (start: number, end: number) => {
    setFormName(`${start}–${end}`);
    setFormStartDate(`${start}-08-01`);
    setFormEndDate(`${end}-07-31`);
  };

  // Handle submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập tên năm học');
      return;
    }

    if (formStartDate && formEndDate && formStartDate >= formEndDate) {
      toast.error('Ngày bắt đầu năm học phải trước ngày kết thúc');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingYear) {
        await academicYearService.updateAcademicYear(
          editingYear.id,
          {
            name: trimmed,
            start_date: formStartDate,
            end_date: formEndDate,
            is_active: formIsActive,
          },
          profile
        );
        toast.success(`Đã cập nhật năm học "${trimmed}" thành công!`);
      } else {
        await academicYearService.createAcademicYear(
          {
            name: trimmed,
            start_date: formStartDate,
            end_date: formEndDate,
            is_active: formIsActive,
          },
          profile
        );
        toast.success(`Đã thêm năm học "${trimmed}" vào hệ thống thành công!`);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể lưu thông tin năm học');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set active academic year
  const handleSetActive = async (ay: AcademicYear) => {
    if (ay.is_active) return;
    setSettingActiveId(ay.id);
    try {
      await academicYearService.setActiveAcademicYear(ay.id, profile);
      toast.success(`Đã kích hoạt năm học "${ay.name}" làm năm học hiện hành!`);
      await loadData();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể đặt năm học hiện hành');
    } finally {
      setSettingActiveId(null);
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!yearToDelete) return;

    setIsDeleting(true);
    try {
      await academicYearService.deleteAcademicYear(yearToDelete.id, profile);
      toast.success(`Đã xóa năm học "${yearToDelete.name}" thành công!`);
      setYearToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể xóa năm học');
    } finally {
      setIsDeleting(false);
    }
  };

  const activeYear = academicYears.find((y) => y.is_active);
  const totalResources = academicYears.reduce((sum, y) => sum + (y.resource_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản Lý Năm Học & Niên Khóa
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {academicYears.length} năm học
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản trị các niên khóa học tập Trường TH&THCS Nguyễn Đình Anh, phân loại tài nguyên và kích hoạt năm học hiện hành
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Năm Học Mới</span>
          </button>
        )}
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Active Year */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-4 text-white shadow-xs relative overflow-hidden">
          <div className="absolute right-2 -bottom-2 opacity-10 pointer-events-none">
            <CalendarDays className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between text-indigo-100 text-xs font-medium mb-1">
            <span>Năm học hiện hành</span>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
              ACTIVE
            </span>
          </div>
          <div className="text-2xl font-black tracking-tight">
            {activeYear ? `Năm học ${activeYear.name}` : 'Chưa thiết lập'}
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            {activeYear
              ? `${activeYear.start_date || '01/08'} đến ${activeYear.end_date || '31/07'} • ${
                  activeYear.resource_count || 0
                } học liệu`
              : 'Vui lòng chọn một năm học để kích hoạt'}
          </p>
        </div>

        {/* Card 2: Total Years */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng số năm học</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{academicYears.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">Lưu trữ qua các thời kỳ</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Resources associated */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Học liệu theo niên khóa</p>
            <p className="text-2xl font-bold text-indigo-600 mt-0.5">{totalResources}</p>
            <p className="text-[11px] text-slate-400 mt-1">Tài nguyên được gán năm học</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content List / Cards */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500 text-xs">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
          <span>Đang tải danh sách năm học...</span>
        </div>
      ) : academicYears.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            Chưa có năm học nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Hãy thêm năm học mới để giáo viên có thể gắn tài nguyên số theo niên khóa giảng dạy.
          </p>
          {canManage && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Năm Học Đầu Tiên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {academicYears.map((ay) => {
            const isActive = ay.is_active;
            const resCount = ay.resource_count || 0;

            return (
              <div
                key={ay.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition group relative ${
                  isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/10'
                    : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                {/* Active Tag */}
                {isActive && (
                  <div className="absolute -top-3 right-4 bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Năm học hiện hành</span>
                  </div>
                )}

                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                        } transition`}
                      >
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">
                          Năm học {ay.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          ID: <span className="font-mono">{ay.id}</span>
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(ay)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="Chỉnh sửa năm học"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setYearToDelete(ay)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Xóa năm học"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dates information */}
                  <div className="my-3 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Thời gian bắt đầu:</span>
                      <span className="font-semibold text-slate-800">
                        {ay.start_date || '01/08'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Thời gian kết thúc:</span>
                      <span className="font-semibold text-slate-800">
                        {ay.end_date || '31/07'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400">Tài nguyên số:</span>
                      <span className="font-bold text-indigo-600">
                        {resCount} học liệu
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={`#/resources?school_year=${encodeURIComponent(ay.name)}`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                  >
                    <span>Lọc học liệu năm này</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {canManage && !isActive && (
                    <button
                      onClick={() => handleSetActive(ay)}
                      disabled={settingActiveId === ay.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      {settingActiveId === ay.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      <span>Kích hoạt</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Thêm / Sửa Năm Học */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingYear ? 'Chỉnh Sửa Năm Học' : 'Thêm Năm Học Mới'}
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
              {/* Quick suggestions */}
              {!editingYear && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                    Gợi ý nhanh niên khóa:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetYearSuggestion(2026, 2027)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[11px] font-medium transition cursor-pointer"
                    >
                      2026–2027
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetYearSuggestion(2027, 2028)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[11px] font-medium transition cursor-pointer"
                    >
                      2027–2028
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetYearSuggestion(2028, 2029)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-[11px] font-medium transition cursor-pointer"
                    >
                      2028–2029
                    </button>
                  </div>
                </div>
              )}

              {/* Tên năm học */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên năm học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 2026–2027"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Định dạng chuẩn GDPT: YYYY–YYYY (ví dụ: 2026–2027)
                </p>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Is Active Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/60 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800">
                      Đặt làm năm học hiện hành (Active)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Khi chọn mục này, hệ thống sẽ tự động gán mặc định năm học này khi giáo viên tải lên học liệu mới.
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
                      <span>{editingYear ? 'Cập nhật' : 'Tạo Năm Học'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận xóa năm học */}
      {yearToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Xác nhận xóa năm học
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa năm học{' '}
              <strong className="text-slate-900">"{yearToDelete.name}"</strong> khỏi hệ thống?
            </p>

            {yearToDelete.resource_count && yearToDelete.resource_count > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 mb-4 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Cảnh báo an toàn dữ liệu:</strong> Niên khóa này đang có{' '}
                  <strong>{yearToDelete.resource_count} học liệu</strong> gắn liền. Hệ thống sẽ chặn xóa để bảo toàn lịch sử học liệu của nhà trường.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 mb-4">
                Thao tác này sẽ gỡ bỏ hoàn toàn niên khóa khỏi danh mục nhà trường.
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setYearToDelete(null)}
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
