import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { departmentService } from '../services/departmentService';
import { userService } from '../services/userService';
import { useToast } from '../hooks/useToast';
import { Department, Profile } from '../types';
import {
  Building2,
  Users,
  UserCheck,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertTriangle,
  X,
  Check,
  BookOpen,
  FolderArchive,
  Info,
  ChevronRight,
} from 'lucide-react';
import { translateSupabaseError } from '../utils/errorHandling';
import { normalizeDepartmentName } from '../utils/formatters';

export function AdminDepartmentsPage() {
  const { profile } = useAuth();
  const toast = useToast();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLeaderId, setFormLeaderId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation modal state
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Selected department for viewing member list
  const [viewingMembersDept, setViewingMembersDept] = useState<Department | null>(null);

  const canManage = profile?.role === 'ADMIN' || profile?.role === 'SCHOOL_ADMIN' || profile?.role === 'VICE_PRINCIPAL';

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptData, profileData] = await Promise.all([
        departmentService.getDepartments(profile),
        userService.getProfiles(profile).catch(() => []),
      ]);
      setDepartments(deptData);
      setAllProfiles(profileData);
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể tải danh sách tổ chuyên môn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  // Open modal for creating new department
  const handleOpenCreateModal = () => {
    setEditingDept(null);
    setFormName('');
    setFormDescription('');
    setFormLeaderId('');
    setIsModalOpen(true);
  };

  // Open modal for editing existing department
  const handleOpenEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormDescription(dept.description || '');
    setFormLeaderId(dept.leader_id || '');
    setIsModalOpen(true);
  };

  // Check if current formName collides with another department
  const duplicateDept = useMemo(() => {
    const trimmed = formName.trim();
    if (!trimmed) return null;
    const norm = normalizeDepartmentName(trimmed);
    return (
      departments.find(
        (d) =>
          (!editingDept || d.id !== editingDept.id) &&
          normalizeDepartmentName(d.name) === norm
      ) || null
    );
  }, [formName, departments, editingDept]);

  // Handle submit (Create or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = formName.trim();
    if (!trimmed) {
      toast.error('Vui lòng nhập tên tổ chuyên môn');
      return;
    }

    if (duplicateDept) {
      toast.error(`Tổ chuyên môn "${duplicateDept.name}" đã tồn tại trong hệ thống.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingDept) {
        // Update
        await departmentService.updateDepartment(
          editingDept.id,
          {
            name: trimmed,
            description: formDescription.trim() || null,
            leader_id: formLeaderId || null,
          },
          profile
        );
        toast.success(`Đã cập nhật tổ chuyên môn "${trimmed}" thành công!`);
      } else {
        // Create
        await departmentService.createDepartment(
          {
            name: trimmed,
            description: formDescription.trim() || null,
            leader_id: formLeaderId || null,
          },
          profile
        );
        toast.success(`Đã tạo mới tổ chuyên môn "${trimmed}" thành công!`);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể lưu thông tin tổ chuyên môn');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const confirmDelete = async () => {
    if (!deptToDelete) return;

    setIsDeleting(true);
    try {
      await departmentService.deleteDepartment(deptToDelete.id, profile);
      toast.success(`Đã xóa tổ chuyên môn "${deptToDelete.name}" thành công!`);
      setDeptToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể xóa tổ chuyên môn');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered departments based on search query
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase().trim();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        (d.leader?.full_name && d.leader.full_name.toLowerCase().includes(q))
    );
  }, [departments, searchQuery]);

  // Teachers in currently selected department for viewing
  const departmentTeachers = useMemo(() => {
    if (!viewingMembersDept) return [];
    return allProfiles.filter((p) => p.department_id === viewingMembersDept.id);
  }, [viewingMembersDept, allProfiles]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản lý Tổ Chuyên Môn
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {departments.length} tổ
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản trị các tổ chuyên môn trường TH&THCS, bổ nhiệm Tổ trưởng và phân công quản lý học liệu theo tổ
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Tổ Chuyên Môn</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên tổ hoặc tổ trưởng..."
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

        <div className="text-xs text-slate-500 self-end sm:self-auto font-medium">
          Hiển thị <strong>{filteredDepartments.length}</strong> / {departments.length} tổ chuyên môn
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500 text-xs">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
          <span>Đang tải thông tin tổ chuyên môn...</span>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            Không tìm thấy tổ chuyên môn nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {searchQuery
              ? `Không có kết quả nào phù hợp với từ khóa "${searchQuery}".`
              : 'Hệ thống chưa có tổ chuyên môn nào được thiết lập.'}
          </p>
          {canManage && !searchQuery && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Tạo tổ chuyên môn đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDepartments.map((dept) => {
            const memberCount =
              dept.member_count ??
              allProfiles.filter((p) => p.department_id === dept.id).length;

            return (
              <div
                key={dept.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors">
                          {dept.name}
                        </h3>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Mã: {dept.id.slice(0, 10)}
                        </div>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(dept)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="Chỉnh sửa thông tin tổ"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeptToDelete(dept)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Xóa tổ chuyên môn"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-2">
                    {dept.description || 'Chưa có mô tả chi tiết cho tổ chuyên môn này.'}
                  </p>
                </div>

                {/* Footer Info */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  {/* Leader info */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 truncate mr-2">
                      <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="truncate">
                        Tổ trưởng:{' '}
                        {dept.leader ? (
                          <strong className="text-slate-900">{dept.leader.full_name}</strong>
                        ) : (
                          <span className="text-slate-400 italic">Chưa phân công</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Member count & View button */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      onClick={() => setViewingMembersDept(dept)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{memberCount} giáo viên</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>

                    <span className="text-[10px] text-slate-400">
                      Cập nhật: {new Date(dept.updated_at || dept.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Thêm / Sửa Tổ Chuyên Môn */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingDept ? 'Chỉnh Sửa Tổ Chuyên Môn' : 'Thêm Tổ Chuyên Môn Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingDept ? `Cập nhật thông tin cho ${editingDept.name}` : 'Thiết lập tổ chuyên môn mới trong trường'}
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
                  Tên tổ chuyên môn <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tổ Toán - Tin học, Tổ Khoa học Tự nhiên..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:bg-white transition ${
                    duplicateDept
                      ? 'border-amber-400 focus:ring-amber-500/20 focus:border-amber-500 bg-amber-50/30'
                      : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                  }`}
                />

                {/* Gợi ý chuẩn hóa tên nếu chưa có tiền tố "Tổ " */}
                {!duplicateDept &&
                  formName.trim().length > 1 &&
                  !formName.trim().toLowerCase().startsWith('tổ ') && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 px-0.5">
                      <span>Quy chuẩn đặt tên:</span>
                      <button
                        type="button"
                        onClick={() => setFormName(`Tổ ${formName.trim()}`)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline cursor-pointer transition"
                      >
                        Đổi thành "Tổ {formName.trim()}"
                      </button>
                    </div>
                  )}

                {/* Cảnh báo trùng lặp trực quan thời gian thực */}
                {duplicateDept && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="font-bold text-amber-950">
                        Tổ chuyên môn "{duplicateDept.name}" đã tồn tại trong hệ thống.
                      </p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Hệ thống tự động nhận diện cả "Tổ..." và tên không có tiền tố "Tổ" là cùng một tổ chuyên môn để bảo toàn dữ liệu giáo viên và học liệu.
                      </p>
                      {!editingDept && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(duplicateDept)}
                          className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-xs"
                        >
                          <Pencil className="w-3 h-3" />
                          Chuyển sang chỉnh sửa tổ "{duplicateDept.name}" hiện có
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mô tả chức năng & nhiệm vụ
                </label>
                <textarea
                  rows={3}
                  placeholder="Phụ trách giảng dạy và thẩm định kế hoạch bài dạy các môn Toán học, Tin học..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition resize-none"
                />
              </div>

              {/* Leader Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bổ nhiệm Tổ trưởng chuyên môn
                </label>
                <select
                  value={formLeaderId}
                  onChange={(e) => setFormLeaderId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
                >
                  <option value="">-- Chưa phân công (Để trống) --</option>
                  {allProfiles.map((p) => {
                    const isCurrentLeader = editingDept?.leader_id === p.id;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.role === 'ADMIN' ? 'Admin' : p.role === 'SCHOOL_ADMIN' ? 'Hiệu trưởng' : p.role === 'VICE_PRINCIPAL' ? 'Phó hiệu trưởng' : p.role === 'SUBJECT_LEADER' ? 'Tổ trưởng' : p.role === 'VICE_SUBJECT_LEADER' ? 'Tổ phó' : 'Giáo viên'}) - {p.email || 'Không có email'}
                        {isCurrentLeader ? ' (Đang là Tổ trưởng)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span>
                    Giáo viên được chọn sẽ tự động được cấp quyền <strong>SUBJECT_LEADER</strong> để thẩm định
                    học liệu nộp lên từ các giáo viên trong tổ.
                  </span>
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
                  disabled={isSubmitting || !!duplicateDept}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingDept ? 'Cập nhật Tổ' : 'Tạo Tổ Mới'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận xóa tổ chuyên môn */}
      {deptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Xác nhận xóa tổ chuyên môn
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa tổ chuyên môn{' '}
              <strong className="text-slate-900">"{deptToDelete.name}"</strong>?
            </p>

            {/* Safety warnings */}
            {(() => {
              const members = allProfiles.filter((p) => p.department_id === deptToDelete.id).length;
              if (members > 0) {
                return (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Cảnh báo:</strong> Tổ này đang có <strong>{members} giáo viên</strong> trực thuộc.
                      Hệ thống sẽ từ chối xóa để đảm bảo toàn vẹn dữ liệu giáo viên.
                    </span>
                  </div>
                );
              }
              return (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 mb-4">
                  Thao tác này sẽ gỡ bỏ hoàn toàn tổ chuyên môn khỏi danh mục của nhà trường.
                </div>
              );
            })()}

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeptToDelete(null)}
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

      {/* MODAL: Xem danh sách giáo viên của tổ */}
      {viewingMembersDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    Thành viên {viewingMembersDept.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Danh sách giáo viên trực thuộc tổ chuyên môn ({departmentTeachers.length} thầy/cô)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingMembersDept(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Member list content */}
            <div className="p-5 max-h-96 overflow-y-auto space-y-2 text-xs">
              {departmentTeachers.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Hiện chưa có giáo viên nào trực thuộc tổ này.</p>
                </div>
              ) : (
                departmentTeachers.map((t) => {
                  const isLeader = viewingMembersDept.leader_id === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        isLeader
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                            isLeader
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {t.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{t.full_name}</span>
                            {isLeader && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                                Tổ trưởng
                              </span>
                            )}
                            {t.role === 'VICE_SUBJECT_LEADER' && !isLeader && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-orange-200 text-orange-900">
                                Tổ phó
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{t.email}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {t.subject?.name || 'Chưa gắn môn'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewingMembersDept(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
