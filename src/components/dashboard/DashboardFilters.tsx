import React, { useState } from 'react';
import {
  Filter,
  RotateCcw,
  Calendar,
  Building2,
  BookOpen,
  GraduationCap,
  Layers,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import {
  DashboardFilterParams,
  DashboardTimeRange,
  AcademicYear,
  Department,
  Subject,
  Grade,
  ResourceType,
  Profile,
} from '../../types';

interface DashboardFiltersProps {
  profile: Profile | null;
  filters: DashboardFilterParams;
  academicYears: AcademicYear[];
  departments: Department[];
  subjects: Subject[];
  grades: Grade[];
  resourceTypes: ResourceType[];
  onApply: (newFilters: DashboardFilterParams) => void;
  onReset: () => void;
}

export function DashboardFilters({
  profile,
  filters,
  academicYears,
  departments,
  subjects,
  grades,
  resourceTypes,
  onApply,
  onReset,
}: DashboardFiltersProps) {
  const [localFilters, setLocalFilters] = useState<DashboardFilterParams>({ ...filters });
  const [isExpanded, setIsExpanded] = useState(false);

  const userRole = profile?.role;
  const isTeacher = userRole === 'TEACHER';
  const isSubjectLeader = userRole === 'SUBJECT_LEADER' || userRole === 'VICE_SUBJECT_LEADER';

  // Filter subjects based on selected department
  const filteredSubjects = subjects.filter((s) => {
    if (isSubjectLeader) {
      return s.department_id === profile?.department_id;
    }
    if (localFilters.departmentId && localFilters.departmentId !== 'all') {
      return s.department_id === localFilters.departmentId;
    }
    return true;
  });

  const handleTimeRangeChange = (range: DashboardTimeRange) => {
    setLocalFilters((prev) => ({
      ...prev,
      timeRange: range,
    }));
  };

  const handleChange = (key: keyof DashboardFilterParams, value: any) => {
    setLocalFilters((prev) => {
      const next = { ...prev, [key]: value };
      // Reset subject if department changes
      if (key === 'departmentId') {
        next.subjectId = 'all';
      }
      return next;
    });
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(localFilters);
  };

  const handleReset = () => {
    const defaultFilters: DashboardFilterParams = {
      timeRange: '30days',
      academicYear: '2026–2027',
      departmentId: isSubjectLeader ? profile?.department_id || 'all' : 'all',
      teacherId: 'all',
      subjectId: 'all',
      gradeId: 'all',
      resourceType: 'all',
      status: 'all',
    };
    setLocalFilters(defaultFilters);
    onReset();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs mb-6 overflow-hidden">
      <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-800">Bộ lọc thống kê dữ liệu</h2>
          <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
            {localFilters.timeRange === '30days'
              ? '30 ngày qua'
              : localFilters.timeRange === '7days'
                ? '7 ngày qua'
                : localFilters.timeRange === 'this_month'
                  ? 'Tháng này'
                  : 'Đã tùy biến'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden inline-flex items-center gap-1 text-xs text-indigo-600 font-medium px-2 py-1 rounded-md hover:bg-indigo-50"
          >
            <span>{isExpanded ? 'Thu gọn' : 'Mở rộng bộ lọc'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <form onSubmit={handleApply} className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Time Range */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Khoảng thời gian</span>
            </label>
            <select
              value={localFilters.timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value as DashboardTimeRange)}
              aria-label="Khoảng thời gian"
              className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="today">Hôm nay</option>
              <option value="7days">7 ngày qua</option>
              <option value="30days">30 ngày qua (Mặc định)</option>
              <option value="this_month">Tháng này</option>
              <option value="last_month">Tháng trước</option>
              <option value="this_quarter">Quý này</option>
              <option value="6months">6 tháng qua</option>
              <option value="this_year">Năm 2026</option>
              <option value="academic_year">Cả năm học (2026–2027)</option>
              <option value="custom">Tùy chọn ngày...</option>
            </select>
          </div>

          {/* 2. Academic Year */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <span>Năm học</span>
            </label>
            <select
              value={localFilters.academicYear || 'all'}
              onChange={(e) => handleChange('academicYear', e.target.value)}
              aria-label="Năm học"
              className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">Tất cả năm học</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.name}>
                  Năm học {ay.name} {ay.is_active ? '(Hiện hành)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Department (hidden or disabled for teacher, locked for subject leader) */}
          {!isTeacher && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Tổ chuyên môn</span>
              </label>
              {isSubjectLeader ? (
                <div className="w-full text-xs rounded-lg border border-slate-200 bg-slate-100/80 px-2.5 py-2 text-slate-600 font-medium truncate">
                  {profile?.department?.name || 'Tổ chuyên môn'} (Cố định)
                </div>
              ) : (
                <select
                  value={localFilters.departmentId || 'all'}
                  onChange={(e) => handleChange('departmentId', e.target.value)}
                  aria-label="Tổ chuyên môn"
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="all">Tất cả các tổ</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 4. Subject */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Môn học</span>
            </label>
            <select
              value={localFilters.subjectId || 'all'}
              onChange={(e) => handleChange('subjectId', e.target.value)}
              aria-label="Môn học"
              className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">Tất cả môn học</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Secondary row of filters (Always visible on desktop, expandable on mobile) */}
          <div className={`${isExpanded ? 'block' : 'hidden md:block'} col-span-1 sm:col-span-2 lg:col-span-4 pt-2 border-t border-slate-100`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {/* Grade */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Khối lớp</label>
                <select
                  value={localFilters.gradeId || 'all'}
                  onChange={(e) => handleChange('gradeId', e.target.value)}
                  aria-label="Khối lớp"
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="all">Tất cả các khối</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resource Type */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Loại tài nguyên</span>
                </label>
                <select
                  value={localFilters.resourceType || 'all'}
                  onChange={(e) => handleChange('resourceType', e.target.value)}
                  aria-label="Loại tài nguyên"
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="all">Tất cả loại tài nguyên</option>
                  {resourceTypes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tình trạng phê duyệt</span>
                </label>
                <select
                  value={localFilters.status || 'all'}
                  onChange={(e) => handleChange('status', e.target.value)}
                  aria-label="Tình trạng phê duyệt"
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="approved">Đã phê duyệt</option>
                  <option value="pending_school_approval">Chờ Ban Giám hiệu duyệt</option>
                  <option value="submitted">Chờ Tổ trưởng duyệt</option>
                  <option value="revision_required">Yêu cầu chỉnh sửa</option>
                  <option value="draft">Bản nháp</option>
                  <option value="rejected_by_subject_leader">Tổ trưởng từ chối</option>
                  <option value="rejected_by_school">BGH từ chối</option>
                </select>
              </div>

              {/* Custom dates if selected */}
              {localFilters.timeRange === 'custom' && (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Từ ngày</label>
                    <input
                      type="date"
                      value={localFilters.startDate || ''}
                      onChange={(e) => handleChange('startDate', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Đến ngày</label>
                    <input
                      type="date"
                      value={localFilters.endDate || ''}
                      onChange={(e) => handleChange('endDate', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Đặt lại</span>
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Áp dụng lọc</span>
          </button>
        </div>
      </form>
    </div>
  );
}
