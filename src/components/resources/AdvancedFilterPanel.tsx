import React from 'react';
import {
  ResourceFilterParams,
  Department,
  Subject,
  Grade,
  ResourceType,
  Profile,
  AcademicYear,
  ResourceStatus,
  ResourceSortOption,
} from '../../types';
import { TeacherCombobox } from './TeacherCombobox';
import { RotateCcw, Check, Bookmark, Calendar, CheckSquare, Square } from 'lucide-react';

interface AdvancedFilterPanelProps {
  isOpen: boolean;
  filters: ResourceFilterParams;
  onFilterChange: (newFilters: Partial<ResourceFilterParams>) => void;
  onReset: () => void;
  onApply: () => void;
  onOpenSaveModal: () => void;
  departments: Department[];
  subjects: Subject[];
  grades: Grade[];
  resourceTypes: ResourceType[];
  academicYears: AcademicYear[];
  teachers: Profile[];
  currentUser: Profile | null;
}

const ALL_STATUSES: Array<{ id: ResourceStatus; label: string; badgeColor: string }> = [
  { id: 'draft', label: 'Bản nháp', badgeColor: 'bg-slate-100 text-slate-700' },
  { id: 'submitted', label: 'Chờ Tổ trưởng', badgeColor: 'bg-amber-100 text-amber-800' },
  { id: 'subject_leader_approved', label: 'Tổ trưởng đã duyệt', badgeColor: 'bg-blue-100 text-blue-800' },
  { id: 'pending_school_approval', label: 'Chờ BGH duyệt', badgeColor: 'bg-purple-100 text-purple-800' },
  { id: 'approved', label: 'Đã duyệt', badgeColor: 'bg-emerald-100 text-emerald-800' },
  { id: 'revision_required', label: 'Cần chỉnh sửa', badgeColor: 'bg-orange-100 text-orange-800' },
  { id: 'rejected_by_subject_leader', label: 'Tổ trưởng từ chối', badgeColor: 'bg-rose-100 text-rose-800' },
  { id: 'rejected_by_school', label: 'BGH từ chối', badgeColor: 'bg-rose-100 text-rose-800' },
  { id: 'archived', label: 'Lưu trữ', badgeColor: 'bg-slate-100 text-slate-500' },
];

export function AdvancedFilterPanel({
  isOpen,
  filters,
  onFilterChange,
  onReset,
  onApply,
  onOpenSaveModal,
  departments,
  subjects,
  grades,
  resourceTypes,
  academicYears,
  teachers,
  currentUser,
}: AdvancedFilterPanelProps) {
  if (!isOpen) return null;

  // Toggle helpers for multi-checkbox arrays
  const toggleArrayItem = (key: 'grades' | 'resource_types' | 'statuses', val: string) => {
    const current = (filters[key] as string[]) || [];
    const exists = current.includes(val);
    const updated = exists ? current.filter((x) => x !== val) : [...current, val];
    onFilterChange({ [key]: updated });
  };

  const selectedGrades = filters.grades || (filters.grade_id && filters.grade_id !== 'all' ? [filters.grade_id] : []);
  const selectedTypes = filters.resource_types || (filters.resource_type && filters.resource_type !== 'all' ? [filters.resource_type] : []);
  const selectedStatuses = filters.statuses || (filters.status && filters.status !== 'all' ? [filters.status as ResourceStatus] : []);

  // Filter subjects based on selected department if any
  const filteredSubjects = filters.department_id && filters.department_id !== 'all'
    ? subjects.filter((s) => s.department_id === filters.department_id)
    : subjects;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
          <span>Bộ lọc nâng cao tài nguyên số</span>
          <span className="text-[11px] font-normal text-slate-500">
            (Lọc kết hợp nhiều điều kiện)
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSaveModal}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Lưu bộ lọc</span>
          </button>
        </div>
      </div>

      {/* Main Grid Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        {/* 1. Tổ / Bộ môn */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Tổ / Bộ môn
          </label>
          <select
            value={filters.department_id || 'all'}
            onChange={(e) => {
              onFilterChange({
                department_id: e.target.value,
                subject_id: 'all', // Reset subject when department changes
              });
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="all">Tất cả tổ / bộ môn</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Môn học */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Môn học
          </label>
          <select
            value={filters.subject_id || 'all'}
            onChange={(e) => onFilterChange({ subject_id: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="all">Tất cả môn học</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        {/* 3. Giáo viên tạo (Combobox search) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Giáo viên
          </label>
          <TeacherCombobox
            teachers={teachers}
            selectedTeacherId={filters.teacher_id || filters.owner_id || 'all'}
            onChange={(teacherId) => onFilterChange({ teacher_id: teacherId, owner_id: teacherId })}
            placeholder="Tất cả giáo viên"
          />
        </div>

        {/* 4. Năm học */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Năm học
          </label>
          <select
            value={filters.school_year || 'all'}
            onChange={(e) => onFilterChange({ school_year: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="all">Tất cả năm học</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.name}>
                {ay.name} {ay.is_active ? '(Hiện tại)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Khối lớp & Loại học liệu (Multi-checkbox) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-slate-100 mt-4">
        {/* Khối lớp multi-select */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">Khối lớp (TH & THCS)</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const primaryIds = grades
                    .filter((g) => g.level === 'Tiểu học' || parseInt(g.name.replace(/\D/g, ''), 10) <= 5)
                    .map((g) => g.id);
                  onFilterChange({ grades: primaryIds, grade_id: 'all' });
                }}
                className="text-[10px] text-emerald-600 hover:underline cursor-pointer font-medium"
              >
                Tiểu học (1-5)
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => {
                  const secIds = grades
                    .filter((g) => g.level === 'THCS' || parseInt(g.name.replace(/\D/g, ''), 10) > 5)
                    .map((g) => g.id);
                  onFilterChange({ grades: secIds, grade_id: 'all' });
                }}
                className="text-[10px] text-indigo-600 hover:underline cursor-pointer font-medium"
              >
                THCS (6-9)
              </button>
              {selectedGrades.length > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => onFilterChange({ grades: [], grade_id: 'all' })}
                    className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {grades.map((g) => {
              const checked = selectedGrades.includes(g.id);
              const isPrimary = g.level === 'Tiểu học' || parseInt(g.name.replace(/\D/g, ''), 10) <= 5;
              return (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => toggleArrayItem('grades', g.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    checked
                      ? isPrimary
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                        : 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {checked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{g.name}</span>
                  <span
                    className={`text-[9px] px-1 py-0.5 rounded font-normal ${
                      checked ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isPrimary ? 'Tiểu học' : 'THCS'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loại tài nguyên multi-select */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">Loại tài nguyên</label>
            {selectedTypes.length > 0 && (
              <button
                type="button"
                onClick={() => onFilterChange({ resource_types: [], resource_type: 'all' })}
                className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {resourceTypes.map((rt) => {
              const checked = selectedTypes.includes(rt.name);
              return (
                <button
                  type="button"
                  key={rt.id}
                  onClick={() => toggleArrayItem('resource_types', rt.name)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                    checked
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{rt.name}</span>
                  {checked && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Trạng thái phê duyệt (Multi-status) */}
      <div className="pt-4 border-t border-slate-100 mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-700">
            Trạng thái phê duyệt
          </label>
          {selectedStatuses.length > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange({ statuses: [], status: 'all' })}
              className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
            >
              Bỏ chọn tất cả
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((st) => {
            const checked = selectedStatuses.includes(st.id);
            return (
              <button
                type="button"
                key={st.id}
                onClick={() => toggleArrayItem('statuses', st.id)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  checked
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{st.label}</span>
                {checked && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 4: Khoảng thời gian & Tùy chọn nâng cao */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 mt-4">
        {/* Loại ngày */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Lọc theo thời gian
          </label>
          <select
            value={filters.date_filter_type || 'updated_at'}
            onChange={(e) => onFilterChange({ date_filter_type: e.target.value as any })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="updated_at">Ngày cập nhật gần nhất</option>
            <option value="created_at">Ngày tạo tài nguyên</option>
            <option value="approved_at">Ngày được phê duyệt</option>
          </select>
        </div>

        {/* Từ ngày */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Từ ngày
          </label>
          <div className="relative">
            <input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => onFilterChange({ date_from: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Đến ngày */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Đến ngày
          </label>
          <div className="relative">
            <input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => onFilterChange({ date_to: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Sắp xếp */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Sắp xếp kết quả
          </label>
          <select
            value={filters.sortBy || 'updated_at_desc'}
            onChange={(e) => onFilterChange({ sortBy: e.target.value as ResourceSortOption })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="updated_at_desc">Cập nhật: Mới nhất</option>
            <option value="updated_at_asc">Cập nhật: Cũ nhất</option>
            <option value="created_at_desc">Ngày tạo: Mới nhất</option>
            <option value="created_at_asc">Ngày tạo: Cũ nhất</option>
            <option value="title_asc">Tên tài nguyên: A → Z</option>
            <option value="title_desc">Tên tài nguyên: Z → A</option>
            <option value="approved_at_desc">Ngày duyệt: Mới nhất</option>
            <option value="approved_at_asc">Ngày duyệt: Cũ nhất</option>
          </select>
        </div>

        {/* Nguồn tiếp nhận */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nguồn học liệu
          </label>
          <select
            value={filters.source_type || 'all'}
            onChange={(e) => onFilterChange({ source_type: e.target.value as any })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="all">Tất cả nguồn</option>
            <option value="google_form">Nộp qua Google Form</option>
            <option value="manual">Nhập trực tiếp trong app</option>
          </select>
        </div>
      </div>

      {/* Row 5: Toggle Flags & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 mt-4">
        {/* Checkbox Options */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!filters.only_approved}
              onChange={(e) => onFilterChange({ only_approved: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span className="font-medium text-slate-700">Chỉ tìm tài nguyên đã duyệt</span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!filters.search_in_url}
              onChange={(e) => onFilterChange({ search_in_url: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span className="font-medium text-slate-700">Tìm kiếm cả trong liên kết URL</span>
          </label>
        </div>

        {/* Reset & Apply Buttons */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>
          <button
            type="button"
            onClick={onApply}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Áp dụng bộ lọc</span>
          </button>
        </div>
      </div>
    </div>
  );
}
