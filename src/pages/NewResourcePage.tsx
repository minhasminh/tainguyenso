import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subjectService } from '../services/subjectService';
import { gradeService } from '../services/gradeService';
import { resourceTypeService } from '../services/resourceTypeService';
import { academicYearService } from '../services/academicYearService';
import { departmentService } from '../services/departmentService';
import { resourceService } from '../services/resourceService';
import { useToast } from '../hooks/useToast';
import { Subject, Grade, ResourceType, AcademicYear, Department } from '../types';
import {
  detectResourceProvider,
  getProviderInfo,
  isValidResourceUrl,
} from '../utils/formatters';
import {
  PlusCircle,
  FileText,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  Building,
  GraduationCap,
  BookOpen,
  Calendar,
  Send,
  Save,
  ArrowLeft,
  Loader2,
  ExternalLink,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import { googleDriveConfigService } from '../services/googleDriveConfigService';
import { GoogleDriveConfig } from '../types';
import { GoogleDriveUploadWidget } from '../components/resources/GoogleDriveUploadWidget';
import { GoogleDriveConfigModal } from '../components/resources/GoogleDriveConfigModal';

export function NewResourcePage() {
  const { profile } = useAuth();
  const toast = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState(profile?.department_id || '');
  const [driveConfig, setDriveConfig] = useState<GoogleDriveConfig | null>(null);
  const [isDriveConfigModalOpen, setIsDriveConfigModalOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState(profile?.subject_id || '');
  const [gradeId, setGradeId] = useState('');
  const [className, setClassName] = useState('');
  const [schoolYear, setSchoolYear] = useState('2026–2027');
  const [topic, setTopic] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [notes, setNotes] = useState('');

  // Handle local file selection to auto-fill file name and guess type
  const handleSelectLocalFile = (file: File) => {
    setFileName(file.name);
    if (!title.trim()) {
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setTitle(baseName.replace(/[_-]/g, ' '));
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'ppt' || ext === 'pptx') {
      const match = resourceTypes.find(
        (t) => t.name.toLowerCase().includes('powerpoint') || t.name.toLowerCase().includes('ppt')
      );
      if (match && !resourceType) setResourceType(match.name);
    } else if (ext === 'pdf') {
      const match = resourceTypes.find(
        (t) => t.name.toLowerCase().includes('pdf') || t.name.toLowerCase().includes('đề kiểm tra')
      );
      if (match && !resourceType) setResourceType(match.name);
    } else if (ext === 'doc' || ext === 'docx') {
      const match = resourceTypes.find(
        (t) => t.name.toLowerCase().includes('kế hoạch bài dạy') || t.name.toLowerCase().includes('word')
      );
      if (match && !resourceType) setResourceType(match.name);
    } else if (ext === 'mp4' || ext === 'mkv' || ext === 'avi') {
      const match = resourceTypes.find((t) => t.name.toLowerCase().includes('video'));
      if (match && !resourceType) setResourceType(match.name);
    }
  };

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingInitial(true);
        const [subs, grds, types, years, dConfig, depts] = await Promise.all([
          subjectService.getSubjects(profile),
          gradeService.getGrades(profile),
          resourceTypeService.getResourceTypes(profile),
          academicYearService.getAcademicYears(profile),
          googleDriveConfigService.getConfig(profile),
          departmentService.getDepartments(profile),
        ]);
        setSubjects(subs);
        setGrades(grds);
        setResourceTypes(types);
        setAcademicYears(years);
        setDriveConfig(dConfig);
        setDepartments(depts);

        // Pre-select active academic year
        const activeY = years.find((y) => y.is_active);
        if (activeY) {
          setSchoolYear(activeY.name);
        } else if (years.length > 0) {
          setSchoolYear(years[0].name);
        }

        // Pre-select department
        if (profile?.department_id) {
          setDepartmentId(profile.department_id);
        } else if (depts.length > 0) {
          setDepartmentId(depts[0].id);
        }

        // Pre-select subject if user profile has one
        if (profile?.subject_id) {
          setSubjectId(profile.subject_id);
        } else if (subs.length > 0) {
          setSubjectId(subs[0].id);
        }

        if (grds.length > 0) {
          setGradeId(grds[0].id);
        }
        if (types.length > 0) {
          setResourceType(types[0].name);
        }
      } catch (err: any) {
        toast.error('Không thể tải danh mục dữ liệu khởi tạo');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [profile]);

  // Detected provider for URL
  const normalizedResourceUrl = resourceUrl.trim().startsWith('http://') || resourceUrl.trim().startsWith('https://')
    ? resourceUrl.trim()
    : resourceUrl.trim() ? `https://${resourceUrl.trim()}` : '';
  const detectedProvider = detectResourceProvider(normalizedResourceUrl || resourceUrl);
  const providerInfo = getProviderInfo(detectedProvider);

  // Check section 27: Teacher must belong to a department or select one
  const effectiveDeptId = departmentId || profile?.department_id || (departments[0]?.id || '');
  const hasNoDepartment = profile?.role === 'TEACHER' && !effectiveDeptId;

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!title.trim()) {
      errs.title = 'Tên tài nguyên không được để trống.';
    }
    if (!effectiveDeptId) {
      errs.departmentId = 'Vui lòng chọn tổ chuyên môn.';
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

    const checkUrl = normalizedResourceUrl || resourceUrl.trim();
    if (!checkUrl) {
      if (!fileName) {
        errs.resourceUrl = 'Vui lòng nhập đường dẫn tài nguyên hoặc tải tệp đính kèm.';
      }
    } else if (!isValidResourceUrl(checkUrl)) {
      errs.resourceUrl = 'Đường dẫn tài nguyên không hợp lệ (ví dụ: https://drive.google.com/...)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (asSubmit: boolean = false) => {
    if (hasNoDepartment && departments.length === 0) {
      toast.error('Vui lòng chọn tổ chuyên môn trước khi lưu hoặc gửi duyệt.');
      return;
    }

    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại các trường thông tin bắt buộc.');
      return;
    }

    setSubmitting(true);
    try {
      const matchedYear = academicYears.find((y) => y.name === schoolYear);
      const finalUrl = normalizedResourceUrl || resourceUrl.trim() || (fileName ? `https://drive.google.com/upload/${encodeURIComponent(fileName)}` : 'https://drive.google.com');

      const created = await resourceService.createResource(
        {
          title: title.trim(),
          description: description || (notes ? `Ghi chú: ${notes}` : null),
          department_id: effectiveDeptId || null,
          subject_id: subjectId,
          grade_id: gradeId,
          class_name: className || null,
          school_year: schoolYear,
          academic_year_id: matchedYear ? matchedYear.id : null,
          topic: topic || null,
          resource_type: resourceType,
          resource_url: finalUrl,
          file_name: fileName || null,
          status: asSubmit ? 'submitted' : 'draft',
          source_type: 'manual',
        },
        profile
      );

      if (asSubmit) {
        toast.success('Đã gửi tài nguyên để duyệt thành công.');
      } else {
        toast.success('Đã tạo tài nguyên thành công (Bản nháp).');
      }

      window.location.hash = `#/resources/${created.id}`;
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu tài nguyên.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <span className="text-xs">Đang tải dữ liệu biểu mẫu...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <a
            href="#/resources/my"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Thêm Tài Nguyên Mới
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Đóng góp giáo án, học liệu số, bài giảng điện tử hoặc bài tập tương tác vào hệ thống
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={submitting || hasNoDepartment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            Lưu bản nháp
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={submitting || hasNoDepartment}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 rounded-xl text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Gửi duyệt
          </button>
        </div>
      </div>

      {/* Warning if teacher has no department */}
      {hasNoDepartment && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block text-amber-900">Chưa chọn tổ chuyên môn:</strong>
            Vui lòng chọn Tổ chuyên môn ở mục Phân loại chuyên môn bên dưới trước khi lưu hoặc gửi duyệt tài nguyên.
          </div>
        </div>
      )}

      {/* Suggestion banner: Tải qua Google Form */}
      <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/60 to-white border border-purple-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
              <span>Nộp học liệu nhanh qua biểu mẫu Google Form?</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-200 text-purple-800 uppercase tracking-wider">
                Mới
              </span>
            </h4>
            <p className="text-[11px] text-purple-800/80 mt-0.5">
              Bạn có thể sử dụng biểu mẫu Google Form được nhúng trực tiếp trong ứng dụng để gửi tài nguyên mà không cần nhập từng trường.
            </p>
          </div>
        </div>
        <a
          href="#/upload-resource"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-semibold shrink-0 transition shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Chuyển sang trang Tải tài nguyên
        </a>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            1. Thông tin cơ bản
          </h2>

          {/* 1. Tên tài nguyên * */}
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
              placeholder="Nhập tên tài nguyên... (ví dụ: Bài 1. Lược sử công cụ tính toán)"
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none transition ${
                errors.title ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
              }`}
            />
            {errors.title && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title}
              </p>
            )}
          </div>

          {/* 2. Mô tả */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mô tả ngắn
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tóm tắt nội dung chính, mục tiêu bài học hoặc hướng dẫn sử dụng..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
            />
          </div>

          {/* 8. Chủ đề / Bài học */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chủ đề / Bài học
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ví dụ: Chủ đề A. Máy tính và cộng đồng"
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
            {/* 6. Tổ chuyên môn */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tổ chuyên môn <span className="text-rose-500">*</span>
              </label>
              {profile?.role === 'TEACHER' && profile.department_id ? (
                <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="font-semibold truncate">
                    {profile?.department?.name ||
                      departments.find((d) => d.id === profile.department_id)?.name ||
                      'Tổ chuyên môn'}
                  </span>
                </div>
              ) : (
                <select
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    if (errors.departmentId) setErrors({ ...errors, departmentId: '' });
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none transition ${
                    errors.departmentId
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-200 focus:border-indigo-500'
                  }`}
                >
                  <option value="">-- Chọn tổ chuyên môn --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.departmentId && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.departmentId}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-1">
                {profile?.role === 'TEACHER' && profile.department_id
                  ? 'Tự động lấy theo hồ sơ giáo viên.'
                  : 'Chọn tổ chuyên môn quản lý học liệu.'}
              </p>
            </div>

            {/* 3. Bộ môn * */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bộ môn <span className="text-rose-500">*</span>
              </label>
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  if (errors.subjectId) setErrors({ ...errors, subjectId: '' });
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none transition ${
                  errors.subjectId ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                }`}
              >
                <option value="">-- Chọn bộ môn --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </option>
                ))}
              </select>
              {errors.subjectId && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.subjectId}</p>
              )}
            </div>

            {/* 4. Khối lớp * */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khối lớp <span className="text-rose-500">*</span>
              </label>
              <select
                value={gradeId}
                onChange={(e) => {
                  setGradeId(e.target.value);
                  if (errors.gradeId) setErrors({ ...errors, gradeId: '' });
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none transition ${
                  errors.gradeId ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                }`}
              >
                <option value="">-- Chọn khối lớp --</option>
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
              {errors.gradeId && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.gradeId}</p>
              )}
            </div>

            {/* 5. Lớp */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lớp cụ thể (Tùy chọn)
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ví dụ: 8/1, 8/2... hoặc để trống"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>

            {/* 7. Năm học * */}
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

            {/* 9. Loại tài nguyên * */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Loại tài nguyên <span className="text-rose-500">*</span>
              </label>
              <select
                value={resourceType}
                onChange={(e) => {
                  setResourceType(e.target.value);
                  if (errors.resourceType) setErrors({ ...errors, resourceType: '' });
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none transition ${
                  errors.resourceType ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                }`}
              >
                <option value="">-- Chọn loại tài nguyên --</option>
                {resourceTypes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.resourceType && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.resourceType}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: URL & Storage */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
            3. Đường dẫn tài nguyên trực tuyến
          </h2>

          {/* 10. Đường dẫn tài nguyên * with Realtime Provider Detection */}
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
                onChange={(e) => {
                  setResourceUrl(e.target.value);
                  if (errors.resourceUrl) setErrors({ ...errors, resourceUrl: '' });
                }}
                placeholder="https://drive.google.com/... hoặc https://docs.google.com/... hoặc YouTube, Canva..."
                className={`w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none font-mono transition ${
                  errors.resourceUrl ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-indigo-500'
                }`}
              />
              {isValidResourceUrl(resourceUrl) && (
                <button
                  type="button"
                  onClick={() => window.open(resourceUrl, '_blank', 'noopener,noreferrer')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1"
                  title="Kiểm tra mở liên kết"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>

            {errors.resourceUrl ? (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.resourceUrl}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                Hỗ trợ liên kết lưu trữ: Google Drive, Docs, Slides, Sheets, YouTube, Canva, OneDrive, Dropbox hoặc Website.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 11. Tên file */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên file đính kèm (Tùy chọn)
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Ví dụ: Bai1_LuocSuCongCuTinhToan.pptx"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>

            {/* 12. Ghi chú */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú cho Tổ trưởng (Tùy chọn)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lời nhắn kèm khi gửi thẩm định..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Action Bottom Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            * Thời gian khởi tạo và cập nhật sẽ được máy chủ tự động xác lập (Giờ Việt Nam UTC+7).
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <a
              href="#/resources/my"
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Hủy
            </a>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={submitting || hasNoDepartment}
              className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              Lưu bản nháp
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={submitting || hasNoDepartment}
              className="px-5 py-2 bg-indigo-600 rounded-xl text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Gửi duyệt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
