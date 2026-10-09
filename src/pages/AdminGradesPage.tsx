import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { gradeService } from '../services/gradeService';
import { useToast } from '../hooks/useToast';
import { Grade } from '../types';
import {
  GraduationCap,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FileText,
  AlertTriangle,
  X,
  Check,
  School,
  Sparkles,
} from 'lucide-react';
import { translateSupabaseError } from '../utils/errorHandling';

export function AdminGradesPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<'all' | 'Tiểu học' | 'THCS'>('all');

  // Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [formName, setFormName] = useState('');
  const [formLevel, setFormLevel] = useState<'Tiểu học' | 'THCS'>('Tiểu học');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Xóa
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = profile?.role === 'ADMIN' || profile?.role === 'SCHOOL_ADMIN' || profile?.role === 'VICE_PRINCIPAL';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await gradeService.getGrades(profile);
      setGrades(data);
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể tải danh sách khối lớp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  // Open modal create
  const handleOpenCreateModal = () => {
    setEditingGrade(null);
    setFormName('');
    setFormLevel('Tiểu học');
    setIsModalOpen(true);
  };

  // Open modal edit
  const handleOpenEditModal = (gr: Grade) => {
    setEditingGrade(gr);
    setFormName(gr.name);
    setFormLevel(gr.level === 'Tiểu học' ? 'Tiểu học' : 'THCS');
    setIsModalOpen(true);
  };

  // Handle submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập tên khối lớp');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingGrade) {
        await gradeService.updateGrade(
          editingGrade.id,
          { name: trimmed, level: formLevel },
          profile
        );
        toast.success(`Đã cập nhật khối lớp "${trimmed}" thành công!`);
      } else {
        await gradeService.createGrade(
          { name: trimmed, level: formLevel },
          profile
        );
        toast.success(`Đã tạo mới khối lớp "${trimmed}" thành công!`);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể lưu thông tin khối lớp');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!gradeToDelete) return;

    setIsDeleting(true);
    try {
      await gradeService.deleteGrade(gradeToDelete.id, profile);
      toast.success(`Đã xóa khối lớp "${gradeToDelete.name}" thành công!`);
      setGradeToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể xóa khối lớp');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered grades
  const filteredGrades = useMemo(() => {
    if (levelFilter === 'all') return grades;
    return grades.filter((g) => g.level === levelFilter);
  }, [grades, levelFilter]);

  const primaryCount = grades.filter((g) => g.level === 'Tiểu học').length;
  const secondaryCount = grades.filter((g) => g.level === 'THCS').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Khối Lớp Trường TH&THCS Nguyễn Đình Anh
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {grades.length} khối lớp
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Hệ thống 9 khối lớp học liên cấp từ Khối 1 (Tiểu học) đến Khối 9 (Trung học cơ sở)
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Khối Lớp</span>
          </button>
        )}
      </div>

      {/* Filter Tabs by Level */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setLevelFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              levelFilter === 'all'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({grades.length})
          </button>
          <button
            onClick={() => setLevelFilter('Tiểu học')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              levelFilter === 'Tiểu học'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cấp Tiểu học ({primaryCount} khối: 1 - 5)
          </button>
          <button
            onClick={() => setLevelFilter('THCS')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              levelFilter === 'THCS'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cấp THCS ({secondaryCount} khối: 6 - 9)
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Trường liên cấp <strong>Tiểu học & THCS Nguyễn Đình Anh</strong>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500 text-xs">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
          <span>Đang tải thông tin khối lớp...</span>
        </div>
      ) : filteredGrades.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            Không có khối lớp nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Chưa có khối lớp nào thuộc danh mục này.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredGrades.map((grade) => {
            const isPrimary = grade.level === 'Tiểu học';
            return (
              <div
                key={grade.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition group"
              >
                <div>
                  {/* Card top */}
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isPrimary
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {grade.level || 'Khối lớp'}
                    </span>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleOpenEditModal(grade)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="Sửa tên khối"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setGradeToDelete(grade)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Xóa khối lớp"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Icon & Name */}
                  <div className="flex flex-col items-center text-center my-2">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2.5 font-bold transition-transform duration-200 group-hover:scale-105 ${
                        isPrimary
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                      }`}
                    >
                      <GraduationCap className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                      {grade.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isPrimary ? 'Bậc Tiểu học' : 'Bậc THCS'}
                    </p>
                  </div>
                </div>

                {/* Footer Count */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    {grade.resource_count !== undefined ? `${grade.resource_count} học liệu` : 'Học liệu'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {grade.id.slice(0, 6)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Thêm / Sửa Khối Lớp */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingGrade ? 'Chỉnh Sửa Khối Lớp' : 'Thêm Khối Lớp Mới'}
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
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên khối lớp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khối 1, Khối 2... hoặc Khối 6, Khối 7..."
                  value={formName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormName(val);
                    const num = parseInt(val.replace(/\D/g, ''), 10);
                    if (!isNaN(num)) {
                      setFormLevel(num <= 5 ? 'Tiểu học' : 'THCS');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cấp học trực thuộc
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormLevel('Tiểu học')}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition cursor-pointer ${
                      formLevel === 'Tiểu học'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tiểu học (Khối 1 - 5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormLevel('THCS')}
                    className={`p-2.5 rounded-xl border text-center font-semibold transition cursor-pointer ${
                      formLevel === 'THCS'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    THCS (Khối 6 - 9)
                  </button>
                </div>
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
                      <span>{editingGrade ? 'Cập nhật' : 'Tạo Khối Mới'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận xóa khối lớp */}
      {gradeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Xác nhận xóa khối lớp
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa khối lớp{' '}
              <strong className="text-slate-900">"{gradeToDelete.name}"</strong>?
            </p>

            {gradeToDelete.resource_count && gradeToDelete.resource_count > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Cảnh báo an toàn:</strong> Khối này đang có{' '}
                  <strong>{gradeToDelete.resource_count} học liệu</strong> gắn liền. Hệ thống sẽ chặn xóa để bảo toàn dữ liệu.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 mb-4">
                Thao tác này sẽ gỡ bỏ hoàn toàn khối lớp khỏi danh mục nhà trường.
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setGradeToDelete(null)}
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
