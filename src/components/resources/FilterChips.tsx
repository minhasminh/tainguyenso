import React from 'react';
import { ResourceFilterParams, Department, Subject, Grade, ResourceType, Profile } from '../../types';
import { X, RotateCcw } from 'lucide-react';
import { formatVietnamDate } from '../../utils/formatters';

interface FilterChipsProps {
  filters: ResourceFilterParams;
  departments: Department[];
  subjects: Subject[];
  grades: Grade[];
  resourceTypes: ResourceType[];
  teachers: Profile[];
  onRemoveFilter: (key: keyof ResourceFilterParams, value?: string) => void;
  onClearAll: () => void;
}

export function FilterChips({
  filters,
  departments,
  subjects,
  grades,
  resourceTypes,
  teachers,
  onRemoveFilter,
  onClearAll,
}: FilterChipsProps) {
  const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];

  // 1. Search Query
  const searchVal = filters.search || filters.q;
  if (searchVal && searchVal.trim()) {
    chips.push({
      id: 'search',
      label: `Từ khóa: "${searchVal.trim()}"`,
      onRemove: () => onRemoveFilter('search'),
    });
  }

  // 2. Department (single or multi)
  if (filters.departments && filters.departments.length > 0) {
    filters.departments.forEach((deptId) => {
      const d = departments.find((item) => item.id === deptId);
      if (d) {
        chips.push({
          id: `dept-${deptId}`,
          label: `Tổ: ${d.name}`,
          onRemove: () => onRemoveFilter('departments', deptId),
        });
      }
    });
  } else if (filters.department_id && filters.department_id !== 'all') {
    const d = departments.find((item) => item.id === filters.department_id);
    if (d) {
      chips.push({
        id: 'dept-single',
        label: `Tổ: ${d.name}`,
        onRemove: () => onRemoveFilter('department_id'),
      });
    }
  }

  // 3. Subject (single or multi)
  if (filters.subjects && filters.subjects.length > 0) {
    filters.subjects.forEach((subjId) => {
      const s = subjects.find((item) => item.id === subjId);
      if (s) {
        chips.push({
          id: `subj-${subjId}`,
          label: `Môn: ${s.name}`,
          onRemove: () => onRemoveFilter('subjects', subjId),
        });
      }
    });
  } else if (filters.subject_id && filters.subject_id !== 'all') {
    const s = subjects.find((item) => item.id === filters.subject_id);
    if (s) {
      chips.push({
        id: 'subj-single',
        label: `Môn: ${s.name}`,
        onRemove: () => onRemoveFilter('subject_id'),
      });
    }
  }

  // 4. Grade (single or multi)
  if (filters.grades && filters.grades.length > 0) {
    filters.grades.forEach((gradeId) => {
      const g = grades.find((item) => item.id === gradeId);
      if (g) {
        chips.push({
          id: `grade-${gradeId}`,
          label: `${g.name}`,
          onRemove: () => onRemoveFilter('grades', gradeId),
        });
      }
    });
  } else if (filters.grade_id && filters.grade_id !== 'all') {
    const g = grades.find((item) => item.id === filters.grade_id);
    if (g) {
      chips.push({
        id: 'grade-single',
        label: `${g.name}`,
        onRemove: () => onRemoveFilter('grade_id'),
      });
    }
  }

  // 5. Resource Type (single or multi)
  if (filters.resource_types && filters.resource_types.length > 0) {
    filters.resource_types.forEach((type) => {
      chips.push({
        id: `type-${type}`,
        label: `Loại: ${type}`,
        onRemove: () => onRemoveFilter('resource_types', type),
      });
    });
  } else if (filters.resource_type && filters.resource_type !== 'all') {
    chips.push({
      id: 'type-single',
      label: `Loại: ${filters.resource_type}`,
      onRemove: () => onRemoveFilter('resource_type'),
    });
  }

  // 6. Status (single or multi)
  const getStatusLabel = (st: string) => {
    switch (st) {
      case 'draft': return 'Bản nháp';
      case 'submitted': return 'Chờ Tổ trưởng';
      case 'subject_leader_approved': return 'Tổ trưởng duyệt';
      case 'pending_school_approval': return 'Chờ BGH';
      case 'approved': return 'Đã duyệt';
      case 'revision_required': return 'Cần chỉnh sửa';
      case 'rejected':
      case 'rejected_by_subject_leader':
      case 'rejected_by_school': return 'Bị từ chối';
      case 'archived': return 'Lưu trữ';
      default: return st;
    }
  };

  if (filters.statuses && filters.statuses.length > 0) {
    filters.statuses.forEach((st) => {
      chips.push({
        id: `status-${st}`,
        label: `Trạng thái: ${getStatusLabel(st)}`,
        onRemove: () => onRemoveFilter('statuses', st),
      });
    });
  } else if (filters.status && filters.status !== 'all') {
    chips.push({
      id: 'status-single',
      label: `Trạng thái: ${getStatusLabel(filters.status)}`,
      onRemove: () => onRemoveFilter('status'),
    });
  }

  // 7. Teacher
  const teacherId = filters.teacher_id || filters.owner_id;
  if (teacherId && teacherId !== 'all') {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (teacher) {
      chips.push({
        id: 'teacher',
        label: `Giáo viên: ${teacher.full_name}`,
        onRemove: () => {
          onRemoveFilter('teacher_id');
          onRemoveFilter('owner_id');
        },
      });
    }
  }

  // 8. Academic Year
  if (filters.school_year && filters.school_year !== 'all') {
    chips.push({
      id: 'school_year',
      label: `Năm học: ${filters.school_year}`,
      onRemove: () => onRemoveFilter('school_year'),
    });
  }

  // 9. Date Range
  if (filters.date_from || filters.date_to) {
    const typeLabel =
      filters.date_filter_type === 'created_at'
        ? 'Ngày tạo'
        : filters.date_filter_type === 'approved_at'
        ? 'Ngày duyệt'
        : 'Ngày cập nhật';

    let rangeText = '';
    if (filters.date_from && filters.date_to) {
      rangeText = `${formatVietnamDate(filters.date_from)} - ${formatVietnamDate(filters.date_to)}`;
    } else if (filters.date_from) {
      rangeText = `Từ ${formatVietnamDate(filters.date_from)}`;
    } else if (filters.date_to) {
      rangeText = `Đến ${formatVietnamDate(filters.date_to)}`;
    }

    chips.push({
      id: 'date_range',
      label: `${typeLabel}: ${rangeText}`,
      onRemove: () => {
        onRemoveFilter('date_from');
        onRemoveFilter('date_to');
      },
    });
  }

  // 10. Only Approved
  if (filters.only_approved) {
    chips.push({
      id: 'only_approved',
      label: 'Chỉ tài nguyên đã duyệt',
      onRemove: () => onRemoveFilter('only_approved'),
    });
  }

  // 11. Search in URL
  if (filters.search_in_url) {
    chips.push({
      id: 'search_in_url',
      label: 'Tìm cả trong liên kết URL',
      onRemove: () => onRemoveFilter('search_in_url'),
    });
  }

  // 12. Source Type
  if (filters.source_type && filters.source_type !== 'all') {
    chips.push({
      id: 'source_type',
      label: `Nguồn: ${filters.source_type === 'google_form' ? 'Google Form' : 'Nhập trực tiếp'}`,
      onRemove: () => onRemoveFilter('source_type'),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-2 pb-1 animate-in fade-in duration-150">
      <span className="text-[11px] font-medium text-slate-400 mr-1">Bộ lọc đang áp dụng ({chips.length}):</span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 rounded-lg text-xs font-medium transition"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="p-0.5 hover:bg-indigo-200 rounded-full text-indigo-500 hover:text-indigo-800 transition cursor-pointer"
            title="Xóa tiêu chí này"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-dashed border-slate-200 hover:border-rose-200 rounded-lg text-xs font-medium transition cursor-pointer ml-1"
        title="Xóa toàn bộ bộ lọc"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Xóa tất cả</span>
      </button>
    </div>
  );
}
