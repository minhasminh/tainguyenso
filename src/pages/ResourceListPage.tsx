import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { resourceService } from '../services/resourceService';
import { departmentService } from '../services/departmentService';
import { subjectService } from '../services/subjectService';
import { gradeService } from '../services/gradeService';
import { resourceTypeService } from '../services/resourceTypeService';
import { academicYearService } from '../services/academicYearService';
import { userService } from '../services/userService';
import { savedSearchService } from '../services/savedSearchService';
import { realtimeService } from '../services/realtimeService';
import { googleFormService } from '../services/googleFormService';
import { useToast } from '../hooks/useToast';
import {
  Resource,
  Department,
  Subject,
  Grade,
  ResourceType,
  AcademicYear,
  Profile,
  SavedSearch,
  ResourceFilterParams,
  ResourceSortOption,
  ResourceStatus,
} from '../types';
import { ResourceSearchBar } from '../components/resources/ResourceSearchBar';
import { FilterChips } from '../components/resources/FilterChips';
import { AdvancedFilterPanel } from '../components/resources/AdvancedFilterPanel';
import { ResourceTable } from '../components/resources/ResourceTable';
import { ResourceCardGrid } from '../components/resources/ResourceCardGrid';
import { ResourcePagination } from '../components/resources/ResourcePagination';
import { SaveSearchModal } from '../components/resources/SaveSearchModal';
import {
  FolderOpen,
  Plus,
  Download,
  LayoutGrid,
  List,
  RotateCcw,
  Loader2,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  X,
  CheckSquare,
} from 'lucide-react';
import { getResourceStatusInfo } from '../utils/formatters';

export function ResourceListPage() {
  const { profile } = useAuth();
  const toast = useToast();

  // Metadata dropdown state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // View state
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Parsing initial filters from URL hash
  const initialFiltersFromUrl = useMemo(() => {
    const hash = window.location.hash;
    const qIndex = hash.indexOf('?');
    const searchStr = qIndex !== -1 ? hash.substring(qIndex + 1) : window.location.search.replace(/^\?/, '');
    const p = new URLSearchParams(searchStr);

    const q = p.get('q') || p.get('search') || '';
    const deptId = p.get('department') || p.get('department_id') || 'all';
    const depts = p.get('departments') ? p.get('departments')!.split(',').filter(Boolean) : [];
    const subjId = p.get('subject') || p.get('subject_id') || 'all';
    const subjs = p.get('subjects') ? p.get('subjects')!.split(',').filter(Boolean) : [];
    const grdId = p.get('grade') || p.get('grade_id') || 'all';
    const grds = p.get('grades') ? p.get('grades')!.split(',').filter(Boolean) : [];
    const rType = p.get('type') || p.get('resource_type') || 'all';
    const rTypes = p.get('types') ? p.get('types')!.split(',').filter(Boolean) : [];
    const teacher = p.get('teacher') || p.get('owner_id') || 'all';
    const status = (p.get('status') || 'all') as ResourceStatus | 'all';
    const statuses = p.get('statuses')
      ? (p.get('statuses')!.split(',').filter(Boolean) as ResourceStatus[])
      : [];
    const year = p.get('year') || p.get('school_year') || 'all';
    const dateType = (p.get('date_type') as any) || 'updated_at';
    const dateFrom = p.get('date_from') || '';
    const dateTo = p.get('date_to') || '';
    const onlyApproved = p.get('only_approved') === '1' || p.get('only_approved') === 'true';
    const searchUrl = p.get('search_in_url') === '1' || p.get('search_in_url') === 'true';
    const sort = (p.get('sort') as ResourceSortOption) || 'updated_at_desc';
    const page = parseInt(p.get('page') || '1', 10) || 1;
    const size = parseInt(p.get('size') || '20', 10) || 20;

    const initialView = p.get('view') === 'grid' ? 'grid' : 'table';

    return {
      filters: {
        search: q,
        q,
        department_id: deptId,
        departments: depts,
        subject_id: subjId,
        subjects: subjs,
        grade_id: grdId,
        grades: grds,
        resource_type: rType,
        resource_types: rTypes,
        teacher_id: teacher,
        owner_id: teacher,
        status,
        statuses,
        school_year: year,
        date_filter_type: dateType,
        date_from: dateFrom,
        date_to: dateTo,
        only_approved: onlyApproved,
        search_in_url: searchUrl,
        sortBy: sort,
        page,
        pageSize: size,
      } as ResourceFilterParams,
      view: initialView as 'table' | 'grid',
    };
  }, []);

  const [filters, setFilters] = useState<ResourceFilterParams>(initialFiltersFromUrl.filters);

  // Set initial view from URL
  useEffect(() => {
    setViewMode(initialFiltersFromUrl.view);
  }, [initialFiltersFromUrl.view]);

  // Data state
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Admin delete states
  const isAdmin = profile?.role === 'ADMIN';
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);

  // Sync state to URL without reloading
  const syncUrl = useCallback(
    (currentFilters: ResourceFilterParams, currentView: 'table' | 'grid') => {
      const cleanBase = window.location.hash.split('?')[0].replace(/^#/, '') || '/resources';
      const targetBase = cleanBase.startsWith('/resources') ? cleanBase : '/resources';
      const p = new URLSearchParams();

      const q = (currentFilters.q || currentFilters.search || '').trim();
      if (q) p.set('q', q);
      if (currentFilters.department_id && currentFilters.department_id !== 'all') {
        p.set('department', currentFilters.department_id);
      }
      if (currentFilters.departments && currentFilters.departments.length > 0) {
        p.set('departments', currentFilters.departments.join(','));
      }
      if (currentFilters.subject_id && currentFilters.subject_id !== 'all') {
        p.set('subject', currentFilters.subject_id);
      }
      if (currentFilters.subjects && currentFilters.subjects.length > 0) {
        p.set('subjects', currentFilters.subjects.join(','));
      }
      if (currentFilters.grade_id && currentFilters.grade_id !== 'all') {
        p.set('grade', currentFilters.grade_id);
      }
      if (currentFilters.grades && currentFilters.grades.length > 0) {
        p.set('grades', currentFilters.grades.join(','));
      }
      if (currentFilters.resource_type && currentFilters.resource_type !== 'all') {
        p.set('type', currentFilters.resource_type);
      }
      if (currentFilters.resource_types && currentFilters.resource_types.length > 0) {
        p.set('types', currentFilters.resource_types.join(','));
      }
      const tId = currentFilters.teacher_id || currentFilters.owner_id;
      if (tId && tId !== 'all') {
        p.set('teacher', tId);
      }
      if (currentFilters.status && currentFilters.status !== 'all') {
        p.set('status', currentFilters.status);
      }
      if (currentFilters.statuses && currentFilters.statuses.length > 0) {
        p.set('statuses', currentFilters.statuses.join(','));
      }
      if (currentFilters.school_year && currentFilters.school_year !== 'all') {
        p.set('year', currentFilters.school_year);
      }
      if (currentFilters.date_filter_type && currentFilters.date_filter_type !== 'updated_at') {
        p.set('date_type', currentFilters.date_filter_type);
      }
      if (currentFilters.date_from) p.set('date_from', currentFilters.date_from);
      if (currentFilters.date_to) p.set('date_to', currentFilters.date_to);
      if (currentFilters.only_approved) p.set('only_approved', '1');
      if (currentFilters.search_in_url) p.set('search_in_url', '1');
      if (currentFilters.sortBy && currentFilters.sortBy !== 'updated_at_desc') {
        p.set('sort', currentFilters.sortBy);
      }
      if (currentFilters.page && currentFilters.page > 1) {
        p.set('page', String(currentFilters.page));
      }
      if (currentFilters.pageSize && currentFilters.pageSize !== 20) {
        p.set('size', String(currentFilters.pageSize));
      }
      if (currentView === 'grid') p.set('view', 'grid');

      const queryString = p.toString();
      const newHash = `#${targetBase}${queryString ? '?' + queryString : ''}`;
      window.history.replaceState(null, '', newHash);
    },
    []
  );

  // Load metadata on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const [depts, subs, grds, types, ays, users, saved] = await Promise.all([
          departmentService.getDepartments(profile),
          subjectService.getSubjects(profile),
          gradeService.getGrades(profile),
          resourceTypeService.getResourceTypes(profile),
          academicYearService.getAcademicYears(),
          userService.getProfiles(profile),
          savedSearchService.getSavedSearches(profile),
        ]);
        setDepartments(depts);
        setSubjects(subs);
        setGrades(grds);
        setResourceTypes(types);
        setAcademicYears(ays);
        setTeachers(users.filter((u) => u.status === 'active'));
        setSavedSearches(saved);
      } catch (err) {
        console.warn('Failed loading search metadata:', err);
      }
    }
    loadMeta();
  }, [profile]);

  const [syncingForm, setSyncingForm] = useState(false);

  // Fetch resources using current filters
  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await resourceService.getResources(profile, filters);
      setResources(res.data);
      setTotalCount(res.total);
      setTotalPages(res.totalPages);
      syncUrl(filters, viewMode);
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [profile, filters, viewMode, syncUrl, toast]);

  // Trigger fetch when filters change and subscribe to multi-device realtime events
  useEffect(() => {
    fetchResources();
    const unsubscribe = realtimeService.subscribeToResources(() => {
      fetchResources();
    });
    return unsubscribe;
  }, [fetchResources]);

  // Dedicated manual Google Form sync button handler
  const handleManualSyncForm = async () => {
    if (syncingForm) return;
    setSyncingForm(true);
    try {
      const syncResult = await googleFormService.syncFromGoogleSheet(
        '1gH6zehWNY4pWn9bEzslTBI5ROBzr8Q_Cpug-T5b-8BU',
        profile,
        profile?.email || 'ducminh1973@gmail.com',
        true
      );
      await fetchResources();
      if (syncResult.syncedCount > 0) {
        toast.success(`Đã đồng bộ thành công ${syncResult.syncedCount} tài nguyên mới từ Google Form!`);
      } else {
        toast.success('Đã kiểm tra và làm mới dữ liệu từ Google Form! (Không có tài nguyên mới)');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi đồng bộ Google Form');
    } finally {
      setSyncingForm(false);
    }
  };

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.departments && filters.departments.length > 0) count += filters.departments.length;
    else if (filters.department_id && filters.department_id !== 'all') count++;

    if (filters.subjects && filters.subjects.length > 0) count += filters.subjects.length;
    else if (filters.subject_id && filters.subject_id !== 'all') count++;

    if (filters.grades && filters.grades.length > 0) count += filters.grades.length;
    else if (filters.grade_id && filters.grade_id !== 'all') count++;

    if (filters.resource_types && filters.resource_types.length > 0) count += filters.resource_types.length;
    else if (filters.resource_type && filters.resource_type !== 'all') count++;

    if (filters.statuses && filters.statuses.length > 0) count += filters.statuses.length;
    else if (filters.status && filters.status !== 'all') count++;

    const t = filters.teacher_id || filters.owner_id;
    if (t && t !== 'all') count++;

    if (filters.school_year && filters.school_year !== 'all') count++;
    if (filters.date_from || filters.date_to) count++;
    if (filters.only_approved) count++;
    if (filters.search_in_url) count++;
    return count;
  }, [filters]);

  // Filter modifiers
  const handleUpdateFilter = (partial: Partial<ResourceFilterParams>) => {
    setFilters((prev) => ({
      ...prev,
      ...partial,
      page: 1, // Reset to page 1 on filter change
    }));
  };

  const handleRemoveSingleFilter = (key: keyof ResourceFilterParams, value?: string) => {
    setFilters((prev) => {
      const next = { ...prev, page: 1 };
      if (value && Array.isArray(next[key])) {
        const arr = (next[key] as string[]).filter((x) => x !== value);
        (next as any)[key] = arr;
      } else {
        if (key === 'department_id' || key === 'subject_id' || key === 'grade_id' || key === 'resource_type' || key === 'school_year' || key === 'status') {
          (next as any)[key] = 'all';
        } else if (key === 'teacher_id' || key === 'owner_id') {
          next.teacher_id = 'all';
          next.owner_id = 'all';
        } else if (key === 'search' || key === 'q') {
          next.search = '';
          next.q = '';
        } else if (key === 'date_from' || key === 'date_to') {
          next.date_from = undefined;
          next.date_to = undefined;
        } else if (key === 'only_approved' || key === 'search_in_url') {
          (next as any)[key] = false;
        } else {
          delete (next as any)[key];
        }
      }
      return next;
    });
  };

  const handleClearAllFilters = () => {
    setFilters({
      search: '',
      q: '',
      department_id: 'all',
      departments: [],
      subject_id: 'all',
      subjects: [],
      grade_id: 'all',
      grades: [],
      resource_type: 'all',
      resource_types: [],
      teacher_id: 'all',
      owner_id: 'all',
      status: 'all',
      statuses: [],
      school_year: 'all',
      date_filter_type: 'updated_at',
      date_from: undefined,
      date_to: undefined,
      only_approved: false,
      search_in_url: false,
      sortBy: 'updated_at_desc',
      page: 1,
      pageSize: filters.pageSize || 20,
    });
    toast.info('Đã đặt lại toàn bộ bộ lọc');
  };

  // Saved Searches
  const handleApplySavedSearch = (saved: SavedSearch) => {
    setFilters({
      ...saved.filters_json,
      page: 1,
      pageSize: saved.filters_json.pageSize || filters.pageSize || 20,
    });
    toast.success(`Đã áp dụng bộ lọc "${saved.name}"`);
  };

  const handleDeleteSavedSearch = async (id: string) => {
    try {
      await savedSearchService.deleteSavedSearch(profile, id);
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
      toast.success('Đã xóa bộ lọc đã lưu');
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi xóa');
    }
  };

  // Export filtered data to Excel (CSV with UTF-8 BOM)
  const handleExport = async () => {
    try {
      setExporting(true);
      await resourceService.exportFilteredResourcesToCSV(profile, filters);
      toast.success('Xuất file báo cáo thành công!');
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi xuất dữ liệu');
    } finally {
      setExporting(false);
    }
  };

  // --- ADMIN RESOURCE DELETION HANDLERS ---
  const handleDeleteSingle = (r: Resource) => {
    setDeletingResource(r);
  };

  const handleConfirmDeleteSingle = async () => {
    if (!deletingResource) return;
    setIsDeletingSingle(true);
    try {
      await resourceService.deleteResource(deletingResource.id, profile);
      toast.success(`Đã xóa vĩnh viễn tài nguyên "${deletingResource.title}"`);
      setDeletingResource(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deletingResource.id));
      await fetchResources();
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa tài nguyên.');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (resources.length === 0) return;
    const allCurrentPageIds = resources.map((r) => r.id);
    const allSelected = allCurrentPageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allCurrentPageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allCurrentPageIds])));
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchDeleting(true);
    try {
      const res = await resourceService.batchDeleteResources(selectedIds, profile);
      toast.success(`Đã xóa thành công ${res.deletedCount} tài nguyên số khỏi hệ thống.`);
      setSelectedIds([]);
      setBatchDeleteModalOpen(false);
      await fetchResources();
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra khi xóa hàng loạt.');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Kho tài nguyên số giáo viên
              </h1>
              <p className="text-xs text-slate-500">
                Tìm kiếm, tra cứu học liệu số bám sát chương trình GDPT 2018 cấp TH & THCS
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-0.5 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setViewMode('table');
                  syncUrl(filters, 'table');
                }}
                className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Xem dạng bảng chi tiết"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('grid');
                  syncUrl(filters, 'grid');
                }}
                className={`p-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Xem dạng thẻ lưới"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Sync from Google Form button */}
            <button
              type="button"
              onClick={handleManualSyncForm}
              disabled={syncingForm || loading}
              className="px-3 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer shadow-2xs"
              title="Kéo các bài nộp mới nhất từ biểu mẫu Google Form"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 text-emerald-600 ${syncingForm ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Đồng bộ Form</span>
            </button>

            {/* Export CSV button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || totalCount === 0}
              className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              title="Xuất kết quả tìm kiếm ra tệp Excel (CSV)"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            {/* Upload New Resource Button */}
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/resources/new';
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tải lên tài nguyên</span>
            </button>
          </div>
        </div>

        {/* Quick Search Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <ResourceSearchBar
            initialSearch={filters.search || filters.q || ''}
            onSearchChange={(val) => {
              handleUpdateFilter({ search: val, q: val });
            }}
            onSearchSubmit={fetchResources}
            isAdvancedOpen={isAdvancedOpen}
            onToggleAdvanced={() => setIsAdvancedOpen(!isAdvancedOpen)}
            activeFilterCount={activeFilterCount}
            currentUser={profile}
            savedSearches={savedSearches}
            onApplySavedSearch={handleApplySavedSearch}
            onDeleteSavedSearch={handleDeleteSavedSearch}
            onOpenSaveModal={() => setIsSaveModalOpen(true)}
          />

          {/* Filter Chips Bar */}
          <FilterChips
            filters={filters}
            departments={departments}
            subjects={subjects}
            grades={grades}
            resourceTypes={resourceTypes}
            teachers={teachers}
            onRemoveFilter={handleRemoveSingleFilter}
            onClearAll={handleClearAllFilters}
          />
        </div>
      </div>

      {/* Collapsible Advanced Filter Panel */}
      <AdvancedFilterPanel
        isOpen={isAdvancedOpen}
        filters={filters}
        onFilterChange={handleUpdateFilter}
        onReset={handleClearAllFilters}
        onApply={() => {
          setIsAdvancedOpen(false);
          fetchResources();
        }}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        departments={departments}
        subjects={subjects}
        grades={grades}
        resourceTypes={resourceTypes}
        academicYears={academicYears}
        teachers={teachers}
        currentUser={profile}
      />

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-700">Đang tìm kiếm tài nguyên...</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Đang truy vấn trực tiếp từ cơ sở dữ liệu theo phân quyền
          </p>
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs animate-in fade-in duration-150">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Không tìm thấy tài nguyên nào phù hợp
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            Không có kết quả nào thỏa mãn từ khóa hoặc tổ hợp các tiêu chí lọc bạn đã chọn. Hãy thử
            điều chỉnh từ khóa hoặc xóa bớt bộ lọc.
          </p>
          <button
            type="button"
            onClick={handleClearAllFilters}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa toàn bộ bộ lọc</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Admin Bulk Actions Floating Banner */}
          {isAdmin && selectedIds.length > 0 && (
            <div className="sticky top-20 z-30 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2.5 text-xs">
                <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white font-bold flex items-center justify-center text-[11px]">
                  {selectedIds.length}
                </span>
                <span className="font-medium text-slate-200">
                  Tài nguyên đã được chọn trên trang hiện tại
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Bỏ chọn
                </button>
                <button
                  type="button"
                  onClick={() => setBatchDeleteModalOpen(true)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa {selectedIds.length} tài nguyên đã chọn</span>
                </button>
              </div>
            </div>
          )}

          {/* Data Views */}
          {viewMode === 'table' ? (
            <ResourceTable
              resources={resources}
              currentUser={profile}
              startIndex={(filters.page! - 1) * filters.pageSize! + 1}
              onDelete={handleDeleteSingle}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
            />
          ) : (
            <ResourceCardGrid
              resources={resources}
              currentUser={profile}
              onDelete={handleDeleteSingle}
            />
          )}

          {/* Pagination */}
          <ResourcePagination
            currentPage={filters.page || 1}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={filters.pageSize || 20}
            onPageChange={(page) => handleUpdateFilter({ page })}
            onPageSizeChange={(size) => handleUpdateFilter({ pageSize: size, page: 1 })}
          />
        </div>
      )}

      {/* Save Search Modal */}
      <SaveSearchModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        currentUser={profile}
        currentFilters={filters}
        onSavedSuccess={(newSearch) => {
          setSavedSearches((prev) => [newSearch, ...prev]);
          toast.success(`Đã lưu bộ lọc "${newSearch.name}" thành công!`);
        }}
      />

      {/* ADMIN DELETE SINGLE RESOURCE CONFIRMATION MODAL */}
      {deletingResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Xóa vĩnh viễn tài nguyên số</h3>
                <p className="text-[11px] text-slate-500">
                  {isAdmin ? 'Quyền Quản trị viên (ADMIN)' : 'Tác giả tài nguyên'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeletingResource(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5">
                <div className="font-bold text-slate-900 text-sm line-clamp-2">
                  {deletingResource.title}
                </div>
                {deletingResource.topic && (
                  <div className="text-slate-600 text-xs">
                    Chủ đề: <span className="font-medium">{deletingResource.topic}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-600">
                  <span>Giáo viên: <strong>{deletingResource.owner?.full_name || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Môn: <strong>{deletingResource.subject?.name || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Loại: <strong>{deletingResource.resource_type}</strong></span>
                </div>
                <div className="pt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getResourceStatusInfo(deletingResource.status).badgeClass}`}>
                    {getResourceStatusInfo(deletingResource.status).label}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Cảnh báo:</strong> Thao tác này sẽ xóa vĩnh viễn tài nguyên số và các thông tin liên quan khỏi hệ thống. Hoạt động này sẽ được ghi vào Nhật ký kiểm toán hệ thống.
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isDeletingSingle}
                  onClick={() => setDeletingResource(null)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeletingSingle}
                  onClick={handleConfirmDeleteSingle}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeletingSingle ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xác nhận xóa tài nguyên</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN BATCH DELETE CONFIRMATION MODAL */}
      {batchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Xóa hàng loạt tài nguyên số</h3>
                <p className="text-[11px] text-slate-500">Chức năng đặc quyền Quản trị viên (ADMIN)</p>
              </div>
              <button
                type="button"
                onClick={() => setBatchDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl">
                <p className="text-slate-800 font-medium">
                  Bạn đang chuẩn bị xóa vĩnh viễn <strong className="text-rose-700 text-sm">{selectedIds.length}</strong> tài nguyên số đã chọn khỏi hệ thống.
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Cảnh báo quan trọng:</strong> Hành động này không thể hoàn tác! Toàn bộ {selectedIds.length} tài nguyên sẽ bị xóa khỏi kho tài nguyên số của nhà trường.
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isBatchDeleting}
                  onClick={() => setBatchDeleteModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isBatchDeleting}
                  onClick={handleConfirmBatchDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isBatchDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xóa {selectedIds.length} tài nguyên...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xác nhận xóa {selectedIds.length} tài nguyên</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
