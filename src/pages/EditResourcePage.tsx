import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { resourceService } from '../services/resourceService';
import { subjectService } from '../services/subjectService';
import { gradeService } from '../services/gradeService';
import { resourceTypeService } from '../services/resourceTypeService';
import { academicYearService } from '../services/academicYearService';
import { useToast } from '../hooks/useToast';
import { Resource, Subject, Grade, ResourceType, AcademicYear } from '../types';
import {
  detectResourceProvider,
  getProviderInfo,
  isValidResourceUrl,
} from '../utils/formatters';
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  AlertCircle,
  Building,
  GraduationCap,
  Link as LinkIcon,
  FileText,
  ExternalLink,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';

interface EditResourcePageProps {
  id: string;
}

export function EditResourcePage({ id }: EditResourcePageProps) {
  const { profile } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resource, setResource] = useState<Resource | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [className, setClassName] = useState('');
  const [schoolYear, setSchoolYear] = useState('2026–2027');
  const [topic, setTopic] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [fileName, setFileName] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [r, subs, grds, types, years] = await Promise.all([
          resourceService.getResourceById(id, profile),
          subjectService.getSubjects(profile),
          gradeService.getGrades(profile),
          resourceTypeService.getResourceTypes(profile),
          academicYearService.getAcademicYears(profile),
        ]);

        // Security check: teacher cannot edit another's resource
        if (profile?.role === 'TEACHER' && r.owner_id !== profile.id) {
          toast.error('Bạn không có quyền chỉnh sửa tài nguyên này.');
          window.location.hash = '#/resources';
          return;
        }

        // Section 18: If approved, teacher cannot edit
        if (r.status === 'approved' && profile?.role === 'TEACHER') {
          toast.error('Tài nguyên đã được duyệt chính thức, không thể tự chỉnh sửa.');
          window.location.hash = `#/resources/${id}`;
          return;
        }

        setResource(r);
        setSubjects(subs);
        setGrades(grds);
        setResourceTypes(types);
        setAcademicYears(years);

        // Pre-fill form
        setTitle(r.title);
        setDescription(r.description || '');
        setSubjectId(r.subject_id || '');
        setGradeId(r.grade_id || '');
        setClassName(r.class_name || '');
        setSchoolYear(r.school_year || '2026–2027');
        setTopic(r.topic || '');
        setResourceType(r.resource_type);
        setResourceUrl(r.resource_url);
        setFileName(r.file_name || '');
      } catch (err: any) {
        toast.error(err.message || 'Không thể tải dữ liệu tài nguyên.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, profile]);

  const detectedProvider = detectResourceProvider(resourceUrl);
  const providerInfo = getProviderInfo(detectedProvider);

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!title.trim()) {
      errs.title = 'Tên tài nguyên không được để trống.';
    }
    if (!subjectId) {
      errs.subjectId = 'Vui lòng chọn bộ môn.';
    }
    if (!gradeId) {
      errs.gradeId = 'Vui lòng chọn khối lớp.';
    }
    if (!schoolYear) {
      errs.schoolYear = 'Vui lòng chọn năm học.';
    }
    if (!resourceType) {
      errs.resourceType = 'Vui lòng chọn loại tài nguyên.';
    }
    if (!resourceUrl.trim()) {
      errs.resourceUrl = 'Đường dẫn tài nguyên không được để trống.';
    } else if (!isValidResourceUrl(resourceUrl)) {
      errs.resourceUrl = 'Đường dẫn tài nguyên không hợp lệ. Phải bắt đầu bằng http:// hoặc https://';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleUpdate = async (andSubmit: boolean = false) => {
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin.');
      return;
    }

    setSubmitting(true);
    try {
      const matchedYear = academicYears.find((y) => y.name === schoolYear);
      const updates: Partial<Resource> = {
        title,
        description: description || null,
        subject_id: subjectId,
        grade_id: gradeId,
        class_name: className || null,
        school_year: schoolYear,
        academic_year_id: matchedYear ? matchedYear.id : null,
        topic: topic || null,
        resource_type: resourceType,
        resource_url: resourceUrl,
        file_name: fileName || null,
      };

      if (andSubmit) {
        await resourceService.updateResource(id, updates, profile);
        await resourceService.submitResource(id, 'Giáo viên nộp thẩm định sau khi chỉnh sửa', profile);
      } else {
        await resourceService.updateResource(id, updates, profile);
      }
      toast.success(andSubmit ? 'Đã gửi tài nguyên để duyệt.' : 'Đã cập nhật tài nguyên.');
      window.location.hash = `#/resources/${id}`;
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật tài nguyên.');
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = profile?.role === 'ADMIN';
  const canDelete =
    isAdmin ||
    (resource?.owner_id === profile?.id &&
      (resource?.status === 'draft' || resource?.status === 'revision_required'));

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await resourceService.deleteResource(id, profile);
      toast.success('Đã xóa vĩnh viễn tài nguyên thành công.');
      window.location.hash = '#/resources';
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa tài nguyên.');
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <span className="text-xs">Đang tải biểu mẫu chỉnh sửa...</span>
      </div>
    );
  }

  if (!resource) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <a
            href={`#/resources/${id}`}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Chỉnh Sửa Tài Nguyên
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Cập nhật thông tin học liệu & bài giảng trực tuyến
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleUpdate(false)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            Lưu thay đổi
          </button>
          {resource.status === 'draft' && (
            <button
              type="button"
              onClick={() => handleUpdate(true)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 rounded-xl text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Lưu & Gửi duyệt
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            1. Thông tin cơ bản
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên tài nguyên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors({ ...errors, title: '' });
              }}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
            />
            {errors.title && <p className="text-[11px] text-rose-600 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mô tả ngắn
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chủ đề / Bài học
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Section 2: Educational Context */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            2. Phân loại chuyên môn & Khối lớp
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tổ chuyên môn
              </label>
              <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400" />
                <span className="font-medium truncate">
                  {resource.department?.name || 'Tổ chuyên môn'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bộ môn <span className="text-rose-500">*</span>
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khối lớp <span className="text-rose-500">*</span>
              </label>
              <select
                value={gradeId}
                onChange={(e) => setGradeId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
              >
                <optgroup label="Cấp Tiểu học (Khối 1 - 5)">
                  {grades
                    .filter((g) => g.level === 'Tiểu học' || parseInt(g.name.replace(/\D/g, ''), 10) <= 5)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Cấp THCS (Khối 6 - 9)">
                  {grades
                    .filter((g) => g.level === 'THCS' || parseInt(g.name.replace(/\D/g, ''), 10) > 5)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lớp cụ thể
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Năm học <span className="text-rose-500">*</span>
              </label>
              <select
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
              >
                {academicYears.length > 0 ? (
                  academicYears.map((y) => (
                    <option key={y.id} value={y.name}>
                      Năm học {y.name} {y.is_active ? '(Hiện hành)' : ''}
                    </option>
                  ))
                ) : (
                  <option value={schoolYear}>Năm học {schoolYear}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Loại tài nguyên <span className="text-rose-500">*</span>
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
              >
                {resourceType && !resourceTypes.some((t) => t.name === resourceType) && (
                  <option value={resourceType}>{resourceType} (Tạm ngưng)</option>
                )}
                {resourceTypes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: URL & Storage */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
            3. Đường dẫn tài nguyên trực tuyến
          </h2>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Đường dẫn tài nguyên (URL) <span className="text-rose-500">*</span>
              </label>
              {resourceUrl && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${providerInfo.badgeClass}`}
                >
                  <span>{providerInfo.iconPrefix}</span>
                  <span>{providerInfo.label}</span>
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="url"
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono transition"
              />
              {isValidResourceUrl(resourceUrl) && (
                <button
                  type="button"
                  onClick={() => window.open(resourceUrl, '_blank', 'noopener,noreferrer')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
            {errors.resourceUrl && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.resourceUrl}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên file đính kèm
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="px-3.5 py-2 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-50 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa tài nguyên</span>
              </button>
            )}
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              * Các trường bảo mật hệ thống không thể chỉnh sửa trái thẩm quyền.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`#/resources/${id}`}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Hủy
            </a>
            <button
              type="button"
              onClick={() => handleUpdate(false)}
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 rounded-xl text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Xóa vĩnh viễn tài nguyên số?</h3>
                <p className="text-[11px] text-slate-500">
                  {isAdmin ? 'Quyền Quản trị viên (ADMIN)' : 'Tác giả tài nguyên'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-900 text-sm">{resource.title}</div>
                <div className="text-slate-500 text-[11px]">
                  Tác giả: {resource.owner?.full_name || 'N/A'} • {resource.resource_type}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Cảnh báo:</strong> Thao tác này sẽ xóa vĩnh viễn tài nguyên khỏi hệ thống và không thể hoàn tác.
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeleting ? (
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
    </div>
  );
}
