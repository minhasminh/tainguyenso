import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subjectService } from '../services/subjectService';
import { departmentService } from '../services/departmentService';
import { useToast } from '../hooks/useToast';
import { Subject, Department } from '../types';
import {
  BookOpen,
  Tag,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Building2,
  Users,
  FileText,
  AlertTriangle,
  X,
  Check,
  Filter,
} from 'lucide-react';
import { translateSupabaseError } from '../utils/errorHandling';

export function AdminSubjectsPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  // Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Xóa
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = profile?.role === 'ADMIN' || profile?.role === 'SCHOOL_ADMIN' || profile?.role === 'VICE_PRINCIPAL';

  const loadData = async () => {
    setLoading(true);
    try {
      const [subjectData, deptData] = await Promise.all([
        subjectService.getSubjects(profile),
        departmentService.getDepartments(profile).catch(() => []),
      ]);
      setSubjects(subjectData);
      setDepartments(deptData);
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  // Open modal create
  const handleOpenCreateModal = () => {
    setEditingSubject(null);
    setFormName('');
    setFormCode('');
    setFormDepartmentId('');
    setIsModalOpen(true);
  };

  // Open modal edit
  const handleOpenEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setFormName(sub.name);
    setFormCode(sub.code || '');
    setFormDepartmentId(sub.department_id || '');
    setIsModalOpen(true);
  };

  // Submit form (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) {
      toast.error('Vui lòng nhập tên môn học');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSubject) {
        await subjectService.updateSubject(
          editingSubject.id,
          {
            name: trimmedName,
            code: formCode.trim() ? formCode.trim().toUpperCase() : null,
            department_id: formDepartmentId || null,
          },
          profile
        );
        toast.success(`Đã cập nhật môn học "${trimmedName}" thành công!`);
      } else {
        await subjectService.createSubject(
          {
            name: trimmedName,
            code: formCode.trim() ? formCode.trim().toUpperCase() : null,
            department_id: formDepartmentId || null,
          },
          profile
        );
        toast.success(`Đã tạo mới môn học "${trimmedName}" thành công!`);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể lưu thông tin môn học');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!subjectToDelete) return;

    setIsDeleting(true);
    try {
      await subjectService.deleteSubject(subjectToDelete.id, profile);
      toast.success(`Đã xóa môn học "${subjectToDelete.name}" thành công!`);
      setSubjectToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể xóa môn học');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      // Filter by department
      if (selectedDeptId !== 'all') {
        if (selectedDeptId === 'none') {
          if (sub.department_id) return false;
        } else if (sub.department_id !== selectedDeptId) {
          return false;
        }
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = sub.name.toLowerCase().includes(q);
        const matchesCode = sub.code ? sub.code.toLowerCase().includes(q) : false;
        const matchesDept = sub.department?.name ? sub.department.name.toLowerCase().includes(q) : false;
        return matchesName || matchesCode || matchesDept;
      }

      return true;
    });
  }, [subjects, selectedDeptId, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Danh mục Bộ môn Giảng dạy
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {subjects.length} môn học
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản trị danh mục môn học cấp TH & THCS, gán tổ chuyên môn phụ trách và theo dõi tài nguyên giảng dạy
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Môn Học Mới</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên môn hoặc mã môn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="all">Tất cả tổ chuyên môn</option>
              <option value="none">Chưa gán tổ</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 self-end sm:self-auto font-medium">
          Hiển thị <strong>{filteredSubjects.length}</strong> / {subjects.length} môn học
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500 text-xs">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
          <span>Đang tải danh sách môn học...</span>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            Không tìm thấy môn học nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {searchQuery || selectedDeptId !== 'all'
              ? 'Không có môn học nào phù hợp với bộ lọc tìm kiếm hiện tại.'
              : 'Hệ thống chưa có danh mục môn học nào.'}
          </p>
          {canManage && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm môn học mới
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredSubjects.map((sub) => {
            const deptName = sub.department?.name || departments.find((d) => d.id === sub.department_id)?.name;

            return (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 font-bold border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-200">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
                          {sub.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span className="text-[11px] text-slate-500 font-mono font-bold">
                            {sub.code || 'CHƯA ĐẶT'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleOpenEditModal(sub)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="Chỉnh sửa môn học"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSubjectToDelete(sub)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Xóa môn học"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Department Assignment */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">
                      {deptName ? (
                        <span>{deptName}</span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa phân về tổ</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Footer Counts */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {sub.teacher_count !== undefined ? `${sub.teacher_count} GV` : 'Giáo viên'}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    {sub.resource_count !== undefined ? `${sub.resource_count} học liệu` : 'Học liệu'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Thêm / Sửa Môn Học */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-400/20">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingSubject ? 'Chỉnh Sửa Môn Học' : 'Thêm Môn Học Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingSubject ? `Cập nhật thông tin cho môn ${editingSubject.name}` : 'Thiết lập môn học mới trong chương trình đào tạo'}
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

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên môn học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Toán, Tin học, Giáo dục công dân..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Code */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mã môn học (Viết tắt)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: MATH, CS, GDCD... (để trống sẽ tự sinh)"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition uppercase"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Mã định danh môn học dùng trong quản lý và mã hóa học liệu.
                </p>
              </div>

              {/* Department */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tổ chuyên môn phụ trách
                </label>
                <select
                  value={formDepartmentId}
                  onChange={(e) => setFormDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
                >
                  <option value="">-- Chưa gán tổ chuyên môn --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Tổ trưởng chuyên môn của tổ này sẽ thẩm định kế hoạch bài dạy của môn học.
                </p>
              </div>

              {/* Form Actions */}
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
                      <span>{editingSubject ? 'Cập nhật Môn' : 'Tạo Môn Mới'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận xóa môn học */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Xác nhận xóa môn học
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa môn học{' '}
              <strong className="text-slate-900">"{subjectToDelete.name}"</strong>?
            </p>

            {/* Safety warnings */}
            {(() => {
              if (subjectToDelete.teacher_count && subjectToDelete.teacher_count > 0) {
                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Cảnh báo an toàn:</strong> Đang có{' '}
                      <strong>{subjectToDelete.teacher_count} giáo viên</strong> phụ trách bộ môn này.
                      Hệ thống sẽ từ chối xóa để đảm bảo toàn vẹn dữ liệu.
                    </span>
                  </div>
                );
              }
              if (subjectToDelete.resource_count && subjectToDelete.resource_count > 0) {
                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Cảnh báo an toàn:</strong> Đang có{' '}
                      <strong>{subjectToDelete.resource_count} tài nguyên số</strong> liên kết với môn học này.
                      Vui lòng chuyển tài nguyên trước khi xóa.
                    </span>
                  </div>
                );
              }
              return (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 mb-4">
                  Thao tác này sẽ gỡ bỏ hoàn toàn môn học khỏi danh mục đào tạo của nhà trường.
                </div>
              );
            })()}

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
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
