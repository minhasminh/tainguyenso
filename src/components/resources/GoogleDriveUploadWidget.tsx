import React, { useState } from 'react';
import { GoogleDriveConfig, Profile } from '../../types';
import { GoogleDriveIcon } from './GoogleDriveConfigModal';
import {
  ExternalLink,
  Upload,
  FileCheck,
  CheckCircle2,
  Copy,
  Check,
  FolderOpen,
  Settings,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';

interface GoogleDriveUploadWidgetProps {
  config: GoogleDriveConfig | null;
  selectedSubjectId?: string;
  selectedSubjectName?: string;
  currentUser?: Profile | null;
  currentResourceUrl: string;
  onSelectFile?: (file: File) => void;
  onSetResourceUrl?: (url: string) => void;
  onOpenAdminConfig?: () => void;
}

export function GoogleDriveUploadWidget({
  config,
  selectedSubjectId,
  selectedSubjectName,
  currentUser,
  currentResourceUrl,
  onSelectFile,
  onSetResourceUrl,
  onOpenAdminConfig,
}: GoogleDriveUploadWidgetProps) {
  const toast = useToast();
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'VICE_PRINCIPAL';

  // Determine which Google Drive folder URL to use: subject-specific or default
  const subjectFolderUrl =
    selectedSubjectId && config?.subject_folders?.[selectedSubjectId]
      ? config.subject_folders[selectedSubjectId]
      : null;

  const targetFolderUrl = subjectFolderUrl || config?.folder_url || 'https://drive.google.com';
  const isSubjectSpecific = Boolean(subjectFolderUrl);

  const handleOpenDriveFolder = () => {
    if (!targetFolderUrl) {
      toast.error('Chưa có đường dẫn thư mục Google Drive được thiết lập');
      return;
    }
    window.open(targetFolderUrl, '_blank', 'noopener,noreferrer');
  };

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setSelectedFileSize(`${sizeMb} MB`);
      if (onSelectFile) {
        onSelectFile(file);
      }
      toast.success(`Đã chọn tệp: "${file.name}" (${sizeMb} MB). Bấm mở Google Drive để tải tệp lên!`);
    }
  };

  const handleCopyFolderUrl = () => {
    if (targetFolderUrl) {
      navigator.clipboard.writeText(targetFolderUrl);
      setCopiedLink(true);
      toast.success('Đã sao chép đường dẫn thư mục Google Drive vào bộ nhớ tạm');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // If teacher upload is explicitly disabled and not admin
  if (config && config.allow_teacher_upload === false && !isAdmin) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-blue-200/90 bg-linear-to-br from-blue-50/60 via-indigo-50/30 to-white p-4.5 sm:p-5 shadow-xs transition space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white p-2 border border-blue-200/80 shadow-2xs shrink-0 flex items-center justify-center">
            <GoogleDriveIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm">
                Tải Lên Google Drive Nhà Trường
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                <span>Thư mục trường cấp</span>
              </span>
              {isSubjectSpecific && selectedSubjectName && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Môn: {selectedSubjectName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Thư mục lưu trữ: <span className="font-semibold text-slate-800">{config?.folder_name || 'Kho Học Liệu Số Trường TH&THCS Nguyễn Đình Anh'}</span>
            </p>
          </div>
        </div>

        {/* Admin Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && onOpenAdminConfig && (
            <button
              type="button"
              onClick={onOpenAdminConfig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
              title="Quản trị viên cấu hình đường dẫn Google Drive"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Cấu hình Drive</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100/50 rounded-xl transition cursor-pointer font-medium"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showGuide ? 'Ẩn hướng dẫn' : 'Hướng dẫn'}</span>
          </button>
        </div>
      </div>

      {/* Primary Action Row */}
      <div className="bg-white rounded-xl p-3.5 border border-blue-100 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Đường dẫn thư mục Google Drive:
            </span>
          </div>
          <p className="text-xs font-mono text-slate-500 truncate max-w-md">
            {targetFolderUrl}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyFolderUrl}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            title="Sao chép liên kết thư mục Google Drive"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedLink ? 'Đã chép' : 'Chép link'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenDriveFolder}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer transform active:scale-98"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Mở Thư Mục Google Drive ↗</span>
          </button>
        </div>
      </div>

      {/* Local File Selector Helper */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Helper 1: Chọn tệp từ máy tính để lấy nhanh tên file */}
        <div className="p-3 bg-white/80 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[11px] font-semibold text-slate-700 block">
                {selectedFileName ? 'Đã đính kèm tệp:' : 'Chọn tệp từ máy tính (Tùy chọn):'}
              </span>
              <p className="text-[11px] text-slate-500 truncate">
                {selectedFileName ? `${selectedFileName} (${selectedFileSize})` : 'Tự động trích xuất tên file & định dạng'}
              </p>
            </div>
          </div>

          <label className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 border border-slate-200">
            <span>{selectedFileName ? 'Đổi tệp' : 'Chọn tệp'}</span>
            <input
              type="file"
              onChange={handleLocalFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Helper 2: Trạng thái liên kết Drive */}
        <div className="p-3 bg-white/80 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              currentResourceUrl.includes('drive.google.com') || currentResourceUrl.includes('docs.google.com')
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-slate-100 text-slate-400'
            }`}>
              <FileCheck className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[11px] font-semibold text-slate-700 block">
                Liên kết học liệu đã dán:
              </span>
              <p className="text-[11px] text-slate-500 truncate">
                {currentResourceUrl ? (
                  currentResourceUrl.includes('drive.google.com') || currentResourceUrl.includes('docs.google.com') ? (
                    <span className="text-emerald-600 font-semibold">Đã nhận diện liên kết Google Drive/Docs hợp lệ</span>
                  ) : (
                    <span className="text-indigo-600">{currentResourceUrl}</span>
                  )
                ) : (
                  'Chưa dán liên kết Google Drive'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guide accordion or instruction block */}
      {(showGuide || !currentResourceUrl) && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>Quy trình 3 bước tải học liệu lên Google Drive nhà trường:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] text-slate-300">
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex flex-col justify-between">
              <div>
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold inline-flex items-center justify-center mb-1.5 text-[10px]">
                  1
                </span>
                <p className="font-semibold text-white mb-1">Mở thư mục Google Drive</p>
                <p className="text-slate-400 leading-relaxed">
                  Bấm nút <strong>"Mở Thư Mục Google Drive ↗"</strong> ở trên để truy cập thư mục lưu trữ của trường.
                </p>
              </div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex flex-col justify-between">
              <div>
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold inline-flex items-center justify-center mb-1.5 text-[10px]">
                  2
                </span>
                <p className="font-semibold text-white mb-1">Tải tệp & Bật chia sẻ</p>
                <p className="text-slate-400 leading-relaxed">
                  Kéo thả tệp học liệu (hoặc tạo Google Docs/Slides). Chuột phải chọn <strong>Chia sẻ (Share)</strong> → Chọn <strong>"Bất kỳ ai có đường liên kết"</strong>.
                </p>
              </div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex flex-col justify-between">
              <div>
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold inline-flex items-center justify-center mb-1.5 text-[10px]">
                  3
                </span>
                <p className="font-semibold text-white mb-1">Dán liên kết vào hệ thống</p>
                <p className="text-slate-400 leading-relaxed">
                  Sao chép liên kết tệp vừa tải và dán vào ô <strong>"Đường dẫn tài nguyên (URL)"</strong> bên dưới để hoàn tất.
                </p>
              </div>
            </div>
          </div>

          {config?.instructions && (
            <div className="pt-2 border-t border-slate-800 flex items-start gap-2 text-slate-400 text-[11px]">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>{config.instructions}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
