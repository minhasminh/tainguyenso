import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Users,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { Profile, Department, Subject, UserRole, UserStatus } from '../../types';
import { userService } from '../../services/userService';
import { useToast } from '../../hooks/useToast';
import { getRoleInfo } from '../../utils/formatters';

interface ExcelImportUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  callerProfile: Profile | null;
  departments: Department[];
  subjects: Subject[];
  existingProfiles: Profile[];
  onSuccess: () => void;
}

export interface ParsedTeacherRow {
  index: number;
  selected: boolean;
  fullName: string;
  email: string;
  rawPassword?: string;
  generatedPassword: string;
  departmentName?: string;
  matchedDepartmentId: string | null;
  matchedDepartmentName?: string;
  subjectName?: string;
  matchedSubjectId: string | null;
  matchedSubjectName?: string;
  role: UserRole;
  status: UserStatus;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Generate random secure password
const generateSecurePassword = (prefix = 'GiaoVien'): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz@#$!';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}@${randomPart}`;
};

// Normalize Vietnamese string for robust matching
const normalizeString = (str: string = ''): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-–—_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export function ExcelImportUsersModal({
  isOpen,
  onClose,
  callerProfile,
  departments,
  subjects,
  existingProfiles,
  onSuccess,
}: ExcelImportUsersModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedTeacherRow[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'invalid'>('all');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  // Completed results view
  const [importCompleted, setImportCompleted] = useState(false);
  const [completedResults, setCompletedResults] = useState<{
    successful: Array<{
      full_name: string;
      email: string;
      password: string;
      role: UserRole;
      departmentName?: string;
      subjectName?: string;
    }>;
    failed: Array<{
      full_name: string;
      email: string;
      reason: string;
    }>;
  } | null>(null);

  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen) return null;

  // 1. GENERATE & DOWNLOAD EXCEL TEMPLATE
  const handleDownloadTemplate = () => {
    try {
      // Main template sheet
      const templateData = [
        {
          'Họ và tên': 'Nguyễn Văn Hùng',
          'Email': 'hung.nguyen@thcs.edu.vn',
          'Mật khẩu': 'GiaoVien@2026',
          'Tổ chuyên môn': 'Tổ Toán – Tin',
          'Môn học': 'Toán học',
          'Vai trò': 'Giáo viên',
          'Trạng thái': 'Hoạt động',
        },
        {
          'Họ và tên': 'Trần Thị Thu Trang',
          'Email': 'trang.tran@thcs.edu.vn',
          'Mật khẩu': '',
          'Tổ chuyên môn': 'Tổ Ngữ văn',
          'Môn học': 'Ngữ văn',
          'Vai trò': 'Tổ phó',
          'Trạng thái': 'Hoạt động',
        },
        {
          'Họ và tên': 'Lê Minh Tuấn',
          'Email': 'tuan.le@thcs.edu.vn',
          'Mật khẩu': '',
          'Tổ chuyên môn': 'Tổ Khoa học tự nhiên',
          'Môn học': 'Vật lí',
          'Vai trò': 'Giáo viên',
          'Trạng thái': 'Hoạt động',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);

      // Auto column widths
      ws['!cols'] = [
        { wch: 25 }, // Họ và tên
        { wch: 30 }, // Email
        { wch: 18 }, // Mật khẩu
        { wch: 25 }, // Tổ chuyên môn
        { wch: 20 }, // Môn học
        { wch: 18 }, // Vai trò
        { wch: 15 }, // Trạng thái
      ];

      // Reference sheets for Departments & Subjects in the school
      const deptData = departments.map((d) => ({
        'Mã tổ / ID': d.id,
        'Tên tổ chuyên môn': d.name,
        'Mô tả': d.description || '',
      }));
      const wsDept = XLSX.utils.json_to_sheet(deptData);
      wsDept['!cols'] = [{ wch: 38 }, { wch: 30 }, { wch: 45 }];

      const subData = subjects.map((s) => ({
        'Mã môn': s.code || '',
        'Tên môn học': s.name,
        'Thuộc tổ chuyên môn': departments.find((d) => d.id === s.department_id)?.name || '',
      }));
      const wsSub = XLSX.utils.json_to_sheet(subData);
      wsSub['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 30 }];

      // Instructions sheet
      const guideData = [
        {
          'Cột': 'Họ và tên',
          'Quy định': 'Bắt buộc. Nhập đầy đủ họ và tên giáo viên (Ví dụ: Nguyễn Văn Hùng)',
        },
        {
          'Cột': 'Email',
          'Quy định': 'Bắt buộc. Định dạng email hợp lệ, không trùng với tài khoản đã có trên hệ thống.',
        },
        {
          'Cột': 'Mật khẩu',
          'Quy định': 'Không bắt buộc. Nếu để trống, hệ thống sẽ tự động tạo mật khẩu ngẫu nhiên an toàn.',
        },
        {
          'Cột': 'Tổ chuyên môn',
          'Quy định': 'Nhập chính xác tên tổ (Xem trang DanhSach_ToChuyenMon). Nếu để trống có thể phân bổ sau.',
        },
        {
          'Cột': 'Môn học',
          'Quy định': 'Nhập tên môn học giảng dạy chính (Xem trang DanhSach_MonHoc).',
        },
        {
          'Cột': 'Vai trò',
          'Quy định': 'Nhập một trong các giá trị: "Giáo viên", "Tổ trưởng", "Tổ phó", "Ban Giám hiệu", "Quản trị viên". Mặc định: Giáo viên.',
        },
        {
          'Cột': 'Trạng thái',
          'Quy định': '"Hoạt động" hoặc "Khóa". Mặc định: Hoạt động.',
        },
      ];
      const wsGuide = XLSX.utils.json_to_sheet(guideData);
      wsGuide['!cols'] = [{ wch: 20 }, { wch: 75 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'DanhSach_GiaoVien');
      XLSX.utils.book_append_sheet(wb, wsGuide, 'Huong_Dan');
      XLSX.utils.book_append_sheet(wb, wsDept, 'DanhSach_ToChuyenMon');
      XLSX.utils.book_append_sheet(wb, wsSub, 'DanhSach_MonHoc');

      XLSX.writeFile(wb, 'Mau_Nhap_Danh_Sach_Giao_Vien_THCS.xlsx');
      toast.success('Đã tải xuống file mẫu Excel thành công!');
    } catch (err: any) {
      toast.error('Lỗi khi tải file mẫu: ' + err.message);
    }
  };

  // 2. PARSE EXCEL FILE
  const processExcelFile = (file: File) => {
    setFileName(file.name);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });

        // Find primary sheet
        const sheetName =
          wb.SheetNames.find((name) =>
            name.toLowerCase().includes('giaovien') ||
            name.toLowerCase().includes('giao_vien') ||
            name.toLowerCase().includes('danhsach')
          ) || wb.SheetNames[0];

        const ws = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          toast.error('File Excel không có dữ liệu hoặc bảng trống.');
          setIsParsing(false);
          return;
        }

        // Parse & validate rows
        const parsed: ParsedTeacherRow[] = [];
        const seenEmailsInFile = new Set<string>();

        rawJson.forEach((row, index) => {
          // Identify columns flexibly
          const keys = Object.keys(row);
          const findVal = (matchers: string[]) => {
            for (const key of keys) {
              const normKey = normalizeString(key);
              if (matchers.some((m) => normKey.includes(m))) {
                return String(row[key] || '').trim();
              }
            }
            return '';
          };

          const fullName = findVal(['ho va ten', 'ho ten', 'ten', 'full name', 'fullname']);
          const email = findVal(['email', 'hom thu', 'dia chi email', 'mail']).toLowerCase();
          const rawPassword = findVal(['mat khau', 'password', 'pass']);
          const rawDept = findVal(['to chuyen mon', 'to bo mon', 'to', 'bo mon', 'phong ban', 'department']);
          const rawSubject = findVal(['mon hoc', 'mon giang day', 'mon', 'subject']);
          const rawRole = findVal(['vai tro', 'chuc vu', 'role', 'vi tri']);
          const rawStatus = findVal(['trang thai', 'tinh trang', 'status']);

          // Skip completely empty spacer rows
          if (!fullName && !email) return;

          const errors: string[] = [];
          const warnings: string[] = [];

          // Validate Full Name
          if (!fullName) {
            errors.push('Thiếu họ và tên giáo viên');
          } else if (fullName.length < 2) {
            errors.push('Họ tên quá ngắn');
          }

          // Validate Email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!email) {
            errors.push('Thiếu địa chỉ email');
          } else if (!emailRegex.test(email)) {
            errors.push('Định dạng email không hợp lệ');
          } else if (seenEmailsInFile.has(email)) {
            errors.push('Email trùng lặp với một dòng khác trong file');
          } else if (existingProfiles.some((p) => p.email?.toLowerCase() === email)) {
            errors.push('Email này đã tồn tại trên hệ thống');
          } else {
            seenEmailsInFile.add(email);
          }

          // Match Department
          let matchedDeptId: string | null = null;
          let matchedDeptName: string | undefined = undefined;

          if (rawDept) {
            const normDeptInput = normalizeString(rawDept);
            const foundDept = departments.find(
              (d) =>
                normalizeString(d.name) === normDeptInput ||
                normDeptInput.includes(normalizeString(d.name)) ||
                normalizeString(d.name).includes(normDeptInput)
            );

            if (foundDept) {
              matchedDeptId = foundDept.id;
              matchedDeptName = foundDept.name;
            } else {
              warnings.push(`Không tìm thấy tổ "${rawDept}" (sẽ để trống)`);
            }
          }

          // Match Subject
          let matchedSubId: string | null = null;
          let matchedSubName: string | undefined = undefined;

          if (rawSubject) {
            const normSubInput = normalizeString(rawSubject);
            const foundSub = subjects.find(
              (s) =>
                normalizeString(s.name) === normSubInput ||
                (s.code && s.code.toLowerCase() === normSubInput.toLowerCase()) ||
                normSubInput.includes(normalizeString(s.name))
            );

            if (foundSub) {
              matchedSubId = foundSub.id;
              matchedSubName = foundSub.name;
              // If department not matched yet, auto match department from subject
              if (!matchedDeptId && foundSub.department_id) {
                const subDept = departments.find((d) => d.id === foundSub.department_id);
                if (subDept) {
                  matchedDeptId = subDept.id;
                  matchedDeptName = subDept.name;
                  warnings.push(`Tự động liên kết tổ "${subDept.name}" theo môn ${foundSub.name}`);
                }
              }
            } else {
              warnings.push(`Không tìm thấy môn "${rawSubject}" (sẽ để trống)`);
            }
          }

          // Match Role
          let role: UserRole = 'TEACHER';
          if (rawRole) {
            const normRole = normalizeString(rawRole);
            if (normRole.includes('to truong') || normRole.includes('ttcm')) {
              role = 'SUBJECT_LEADER';
            } else if (normRole.includes('to pho') || normRole.includes('tpcm')) {
              role = 'VICE_SUBJECT_LEADER';
            } else if (
              normRole.includes('ban giam hieu') ||
              normRole.includes('bgh') ||
              normRole.includes('hieu truong') ||
              normRole.includes('quan tri truong')
            ) {
              role = 'SCHOOL_ADMIN';
            } else if (normRole.includes('quan tri vien') || normRole.includes('admin')) {
              role = 'ADMIN';
            } else {
              role = 'TEACHER';
            }
          }

          // Match Status
          let status: UserStatus = 'active';
          if (rawStatus) {
            const normStatus = normalizeString(rawStatus);
            if (normStatus.includes('khoa') || normStatus.includes('locked') || normStatus.includes('tam ngung')) {
              status = 'locked';
            }
          }

          // Password
          const finalPassword = rawPassword || generateSecurePassword('GiaoVien');

          parsed.push({
            index: index + 1,
            selected: errors.length === 0,
            fullName,
            email,
            rawPassword,
            generatedPassword: finalPassword,
            departmentName: rawDept,
            matchedDepartmentId: matchedDeptId,
            matchedDepartmentName: matchedDeptName,
            subjectName: rawSubject,
            matchedSubjectId: matchedSubId,
            matchedSubjectName: matchedSubName,
            role,
            status,
            isValid: errors.length === 0,
            errors,
            warnings,
          });
        });

        if (parsed.length === 0) {
          toast.error('Không tìm thấy dòng dữ liệu nào hợp lệ trong file Excel.');
        } else {
          setParsedRows(parsed);
          const validCount = parsed.filter((r) => r.isValid).length;
          toast.success(`Đã phân tích ${parsed.length} dòng (${validCount} dòng hợp lệ sẵn sàng tạo).`);
        }
      } catch (err: any) {
        toast.error('Lỗi khi đọc file Excel: ' + (err.message || 'File không đúng định dạng.'));
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      toast.error('Lỗi khi tải file vào trình duyệt.');
      setIsParsing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  // Toggle selection
  const handleToggleRow = (index: number) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.index === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleToggleSelectAll = (select: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.isValid ? { ...r, selected: select } : r))
    );
  };

  // 3. EXECUTE BATCH IMPORT
  const handleExecuteImport = async () => {
    const selectedRows = parsedRows.filter((r) => r.selected && r.isValid);
    if (selectedRows.length === 0) {
      toast.error('Vui lòng chọn ít nhất một dòng hợp lệ để nhập vào hệ thống.');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: selectedRows.length });

    const successList: Array<{
      full_name: string;
      email: string;
      password: string;
      role: UserRole;
      departmentName?: string;
      subjectName?: string;
    }> = [];

    const failedList: Array<{
      full_name: string;
      email: string;
      reason: string;
    }> = [];

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];
      setImportProgress({ current: i + 1, total: selectedRows.length });

      try {
        const created = await userService.createProfile(
          {
            full_name: row.fullName.trim(),
            email: row.email.trim().toLowerCase(),
            role: row.role,
            status: row.status,
            department_id: row.matchedDepartmentId,
            subject_id: row.matchedSubjectId,
          },
          callerProfile,
          row.generatedPassword
        );

        successList.push({
          full_name: created.full_name,
          email: created.email || '',
          password: row.generatedPassword,
          role: created.role,
          departmentName: row.matchedDepartmentName,
          subjectName: row.matchedSubjectName,
        });
      } catch (err: any) {
        failedList.push({
          full_name: row.fullName,
          email: row.email,
          reason: err.message || 'Không thể tạo tài khoản',
        });
      }
    }

    setIsImporting(false);
    setImportCompleted(true);
    setCompletedResults({
      successful: successList,
      failed: failedList,
    });

    if (successList.length > 0) {
      toast.success(`Đã tạo thành công ${successList.length} tài khoản giáo viên!`);
      onSuccess();
    }

    if (failedList.length > 0) {
      toast.error(`${failedList.length} tài khoản gặp lỗi không tạo được.`);
    }
  };

  // 4. EXPORT RESULTS TO EXCEL (CREDENTIALS DISPATCH)
  const handleExportCreatedAccounts = () => {
    if (!completedResults || completedResults.successful.length === 0) return;

    try {
      const exportData = completedResults.successful.map((item, idx) => ({
        'STT': idx + 1,
        'Họ và tên': item.full_name,
        'Email đăng nhập': item.email,
        'Mật khẩu ban đầu': item.password,
        'Tổ chuyên môn': item.departmentName || '',
        'Môn học': item.subjectName || '',
        'Vai trò': getRoleInfo(item.role).label,
        'Ghi chú': 'Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 32 },
        { wch: 20 },
        { wch: 25 },
        { wch: 20 },
        { wch: 18 },
        { wch: 45 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tai_Khoan_Giao_Vien_Moi');
      XLSX.writeFile(wb, `Danh_Sach_Cap_Tai_Khoan_${new Date().toISOString().slice(0, 10)}.xlsx`);

      toast.success('Đã xuất file Excel danh sách tài khoản và mật khẩu thành công!');
    } catch (err: any) {
      toast.error('Lỗi khi xuất file: ' + err.message);
    }
  };

  // Copy all credentials to clipboard
  const handleCopyAllCredentials = () => {
    if (!completedResults || completedResults.successful.length === 0) return;

    const text = completedResults.successful
      .map(
        (acc, idx) =>
          `${idx + 1}. ${acc.full_name} | Email: ${acc.email} | Mật khẩu: ${acc.password} | ${getRoleInfo(acc.role).label}`
      )
      .join('\n');

    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
      toast.success('Đã sao chép toàn bộ danh sách tài khoản & mật khẩu!');
    } catch {
      toast.error('Không thể tự động sao chép.');
    }
  };

  // Reset modal state
  const handleResetModal = () => {
    setFileName(null);
    setParsedRows([]);
    setImportCompleted(false);
    setCompletedResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;
  const selectedCount = parsedRows.filter((r) => r.selected && r.isValid).length;

  const displayedRows = parsedRows.filter((r) => {
    if (activeTab === 'valid') return r.isValid;
    if (activeTab === 'invalid') return !r.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Tạo tài khoản giáo viên từ file Excel
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Hàng loạt
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Nhập danh sách giáo viên tự động, tự khớp tổ chuyên môn & tạo mật khẩu ban đầu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* STEP 1: If completed, show result view */}
          {importCompleted && completedResults ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-emerald-950">
                    Đã hoàn thành tạo tài khoản giáo viên!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1">
                    Thành công: <strong>{completedResults.successful.length}</strong> tài khoản{' '}
                    {completedResults.failed.length > 0 && (
                      <span className="text-rose-700 font-semibold">
                        | Thất bại: {completedResults.failed.length} tài khoản
                      </span>
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={handleExportCreatedAccounts}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Tải danh sách tài khoản & Mật khẩu (.xlsx)
                    </button>
                    <button
                      onClick={handleCopyAllCredentials}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      {copiedAll ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedAll ? 'Đã sao chép toàn bộ!' : 'Sao chép thông tin'}</span>
                    </button>
                    <button
                      onClick={handleResetModal}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer ml-auto"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Nhập file khác
                    </button>
                  </div>
                </div>
              </div>

              {/* Table of created accounts */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Danh sách tài khoản vừa tạo ({completedResults.successful.length})</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    (Vui lòng gửi thông tin đăng nhập cho giáo viên tương ứng)
                  </span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Họ và tên</th>
                          <th className="py-2.5 px-3">Email đăng nhập</th>
                          <th className="py-2.5 px-3">Mật khẩu ban đầu</th>
                          <th className="py-2.5 px-3">Tổ chuyên môn</th>
                          <th className="py-2.5 px-3">Vai trò</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {completedResults.successful.map((acc, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{acc.full_name}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{acc.email}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-700 bg-indigo-50/40">
                              {acc.password}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{acc.departmentName || '—'}</td>
                            <td className="py-2.5 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {getRoleInfo(acc.role).label}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Failures if any */}
              {completedResults.failed.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                  <h4 className="text-xs font-bold text-rose-800 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Danh sách không tạo được ({completedResults.failed.length})
                  </h4>
                  <ul className="text-xs text-rose-700 space-y-1 list-disc list-inside">
                    {completedResults.failed.map((f, i) => (
                      <li key={i}>
                        <strong>{f.full_name}</strong> ({f.email}): {f.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* STEP 0: Upload & Download Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Download Template Card */}
                <div className="md:col-span-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-1.5">
                      <Download className="w-4 h-4" />
                      Bước 1: Tải file mẫu
                    </div>
                    <p className="text-xs text-slate-600">
                      Tải mẫu Excel chuẩn có sẵn danh sách Tổ chuyên môn & Môn học của trường để nhập liệu chính xác.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải mẫu Excel (.xlsx)
                  </button>
                </div>

                {/* Upload Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`md:col-span-2 border-2 border-dashed rounded-2xl p-5 text-center flex flex-col items-center justify-center transition cursor-pointer ${
                    dragActive
                      ? 'border-indigo-500 bg-indigo-50/60'
                      : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 shadow-2xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800">
                    {fileName ? (
                      <span className="text-indigo-600 font-semibold">{fileName}</span>
                    ) : (
                      'Kéo thả file Excel vào đây hoặc bấm để chọn'
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Hỗ trợ định dạng .xlsx, .xls (Tối đa 500 giáo viên / lần nhập)
                  </p>
                </div>
              </div>

              {/* Parsing Indicator */}
              {isParsing && (
                <div className="py-8 text-center text-slate-600 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="text-sm font-medium">Đang đọc và đối soát dữ liệu từ file Excel...</span>
                </div>
              )}

              {/* PREVIEW & VALIDATION TABLE */}
              {parsedRows.length > 0 && !isParsing && (
                <div className="space-y-3">
                  {/* Summary & Filter Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-800">
                        Đã nạp: <strong className="text-indigo-600">{parsedRows.length}</strong> giáo viên
                      </span>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => setActiveTab('all')}
                        className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                          activeTab === 'all'
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tất cả ({parsedRows.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('valid')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                          activeTab === 'valid'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80'
                        }`}
                      >
                        Hợp lệ ({validCount})
                      </button>
                      {invalidCount > 0 && (
                        <button
                          onClick={() => setActiveTab('invalid')}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                            activeTab === 'invalid'
                              ? 'bg-rose-600 text-white'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80'
                          }`}
                        >
                          Có lỗi ({invalidCount})
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                      >
                        {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleSelectAll(selectedCount < validCount)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        {selectedCount === validCount ? 'Bỏ chọn tất cả' : 'Chọn tất cả hợp lệ'}
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold z-10">
                          <tr>
                            <th className="py-2.5 px-3 w-8">
                              <input
                                type="checkbox"
                                checked={validCount > 0 && selectedCount === validCount}
                                onChange={(e) => handleToggleSelectAll(e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </th>
                            <th className="py-2.5 px-3">Họ và tên</th>
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">Mật khẩu ban đầu</th>
                            <th className="py-2.5 px-3">Tổ chuyên môn</th>
                            <th className="py-2.5 px-3">Môn học</th>
                            <th className="py-2.5 px-3">Vai trò</th>
                            <th className="py-2.5 px-3">Kiểm tra</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {displayedRows.map((row) => (
                            <tr
                              key={row.index}
                              className={`transition-colors ${
                                !row.isValid
                                  ? 'bg-rose-50/40 hover:bg-rose-50/70'
                                  : row.selected
                                  ? 'bg-blue-50/30 hover:bg-blue-50/60'
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="py-2 px-3">
                                <input
                                  type="checkbox"
                                  disabled={!row.isValid}
                                  checked={row.selected}
                                  onChange={() => handleToggleRow(row.index)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-40 cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {row.fullName || <span className="text-rose-500 italic">Trống</span>}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600">
                                {row.email || <span className="text-rose-500 italic">Trống</span>}
                              </td>
                              <td className="py-2 px-3 font-mono">
                                {showPasswords ? (
                                  <span className="font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                    {row.generatedPassword}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">••••••••</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-700">
                                {row.matchedDepartmentName ? (
                                  <span className="inline-flex items-center gap-1 font-medium text-slate-900">
                                    {row.matchedDepartmentName}
                                  </span>
                                ) : row.departmentName ? (
                                  <span className="text-amber-700 line-through text-[11px]" title="Không khớp với tổ nào trong trường">
                                    {row.departmentName}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa xếp</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-700">
                                {row.matchedSubjectName ? (
                                  <span>{row.matchedSubjectName}</span>
                                ) : row.subjectName ? (
                                  <span className="text-amber-700 line-through text-[11px]">{row.subjectName}</span>
                                ) : (
                                  <span className="text-slate-400 italic">Chưa xếp</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleInfo(row.role).badgeClass}`}>
                                  {getRoleInfo(row.role).label}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                {row.isValid ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      Hợp lệ
                                    </span>
                                    {row.warnings.map((w, wi) => (
                                      <span key={wi} className="text-[10px] text-amber-700">
                                        • {w}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-0.5">
                                    {row.errors.map((err, ei) => (
                                      <span key={ei} className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                        {err}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {!importCompleted && parsedRows.length > 0 && (
              <span>
                Đã chọn <strong>{selectedCount}</strong> / {validCount} tài khoản hợp lệ
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              {importCompleted ? 'Đóng' : 'Hủy bỏ'}
            </button>

            {!importCompleted && (
              <button
                type="button"
                disabled={selectedCount === 0 || isImporting || isParsing}
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition cursor-pointer disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tạo ({importProgress.current}/{importProgress.total})...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    Tạo {selectedCount} tài khoản đã chọn
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
