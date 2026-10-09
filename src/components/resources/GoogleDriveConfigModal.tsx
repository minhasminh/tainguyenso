import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { googleDriveConfigService } from '../../services/googleDriveConfigService';
import { subjectService } from '../../services/subjectService';
import { GoogleDriveConfig, Subject } from '../../types';
import {
  X,
  ExternalLink,
  Check,
  Loader2,
  FolderPlus,
  BookOpen,
  Info,
  Sparkles,
} from 'lucide-react';
import { translateSupabaseError } from '../../utils/errorHandling';

// Google Drive SVG Icon for high visual recognition
export function GoogleDriveIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
      <path
        d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
        fill="#0066da"
      />
      <path
        d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
        fill="#00ac47"
      />
      <path
        d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
        fill="#ea4335"
      />
      <path
        d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
        fill="#00832d"
      />
      <path
        d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
        fill="#2684fc"
      />
      <path
        d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
        fill="#ffba00"
      />
    </svg>
  );
}

interface GoogleDriveConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (newConfig: GoogleDriveConfig) => void;
}

export function GoogleDriveConfigModal({ isOpen, onClose, onSaved }: GoogleDriveConfigModalProps) {
  const { profile } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Form states
  const [folderName, setFolderName] = useState('');
  const [folderUrl, setFolderUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [allowTeacherUpload, setAllowTeacherUpload] = useState(true);
  const [subjectFolders, setSubjectFolders] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'subjects'>('general');

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const [config, subjs] = await Promise.all([
          googleDriveConfigService.getConfig(profile),
          subjectService.getSubjects(profile),
        ]);

        if (isMounted) {
          setFolderName(config.folder_name || 'Kho Học Liệu Số Trường TH&THCS Nguyễn Đình Anh');
          setFolderUrl(config.folder_url || '');
          setInstructions(config.instructions || '');
          setAllowTeacherUpload(config.allow_teacher_upload ?? true);
          setSubjectFolders(config.subject_folders || {});
          setSubjects(subjs);
        }
      } catch (err: any) {
        toast.error(translateSupabaseError(err) || 'Không thể tải cấu hình Google Drive');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubjectFolderChange = (subjectId: string, url: string) => {
    setSubjectFolders((prev) => ({
      ...prev,
      [subjectId]: url,
    }));
  };

  const handleTestLink = (url: string) => {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      toast.error('Vui lòng nhập đường dẫn URL hợp lệ bắt đầu bằng https://');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleQuickExample = () => {
    setFolderName('Kho Học Liệu Số Trường TH&THCS Nguyễn Đình Anh');
    setFolderUrl('https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
    setInstructions(
      'Giáo viên mở thư mục Google Drive của nhà trường, tạo mới hoặc tải tệp học liệu lên, cài đặt quyền chia sẻ "Người có đường liên kết có thể xem", sau đó dán liên kết vào ô Đường dẫn tài nguyên bên dưới.'
    );
    toast.success('Đã áp dụng mẫu cấu hình Google Drive mẫu!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUrl = folderUrl.trim();
    if (!trimmedUrl) {
      toast.error('Vui lòng cung cấp đường dẫn thư mục Google Drive của nhà trường');
      return;
    }

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      toast.error('Đường dẫn phải bắt đầu bằng https:// (VD: https://drive.google.com/drive/folders/...)');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await googleDriveConfigService.updateConfig(
        {
          folder_name: folderName.trim() || 'Kho Học Liệu Số Trường TH&THCS Nguyễn Đình Anh',
          folder_url: trimmedUrl,
          instructions: instructions.trim(),
          allow_teacher_upload: allowTeacherUpload,
          subject_folders: subjectFolders,
        },
        profile
      );

      toast.success('Cập nhật đường dẫn Google Drive lưu trữ học liệu thành công!');
      if (onSaved) onSaved(updated);
      onClose();
    } catch (err: any) {
      toast.error(translateSupabaseError(err) || 'Không thể lưu cấu hình Google Drive');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-2 flex items-center justify-center shadow-xs">
              <GoogleDriveIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">
                  Cấu Hình Google Drive Lưu Trữ Tài Nguyên
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Dành cho Quản trị viên
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cung cấp đường dẫn thư mục Google Drive để giáo viên trực tiếp tải và liên kết học liệu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'general'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Thư mục Google Drive chung của trường
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'subjects'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>2. Thư mục con theo môn học</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
              {subjects.length}
            </span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-2" />
              <span>Đang tải cấu hình Google Drive...</span>
            </div>
          ) : (
            <form id="drive-config-form" onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'general' ? (
                <>
                  {/* Quick preset banner */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-blue-900 leading-relaxed">
                        <span className="font-semibold block mb-0.5">
                          Cơ chế tải lên Google Drive của Trường TH&THCS Nguyễn Đình Anh:
                        </span>
                        Quản trị viên tạo sẵn một Thư mục dùng chung (Shared Drive) trên Google Drive trường, phân quyền cho giáo viên. Đường dẫn thư mục này sẽ hiển thị ngay tại trang{' '}
                        <strong>"Thêm tài nguyên"</strong> để giáo viên mở nhanh, tải tệp lên và dán liên kết học liệu đã duyệt.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickExample}
                      className="px-2.5 py-1.5 bg-white text-blue-700 border border-blue-200 rounded-lg text-[11px] font-semibold hover:bg-blue-50 transition shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Áp dụng mẫu</span>
                    </button>
                  </div>

                  {/* Tên thư mục */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tên hiển thị thư mục <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="Ví dụ: Kho Học Liệu Số Trường TH&THCS Nguyễn Đình Anh"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                    />
                  </div>

                  {/* Đường dẫn URL Google Drive chung */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700">
                        Đường dẫn thư mục Google Drive (URL) <span className="text-rose-500">*</span>
                      </label>
                      {folderUrl && (
                        <button
                          type="button"
                          onClick={() => handleTestLink(folderUrl)}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <span>Mở thử liên kết</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="url"
                        required
                        value={folderUrl}
                        onChange={(e) => setFolderUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Dán liên kết chia sẻ thư mục Google Drive (Khuyên dùng: Quyền "Người xem" hoặc "Người chỉnh sửa" đối với giáo viên nhà trường).
                    </p>
                  </div>

                  {/* Hướng dẫn tải lên */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Hướng dẫn giáo viên thao tác tải lên
                    </label>
                    <textarea
                      rows={3}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Nhập ghi chú hoặc quy định đặt tên tệp, chia sẻ quyền truy cập cho giáo viên..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition resize-none"
                    />
                  </div>

                  {/* Bật/Tắt hiển thị cho giáo viên */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowTeacherUpload}
                        onChange={(e) => setAllowTeacherUpload(e.target.checked)}
                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          Hiển thị trợ lý tải lên Google Drive trong trang "Thêm tài nguyên"
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Khi bật, giáo viên khi thêm học liệu sẽ thấy tiện ích mở nhanh thư mục Google Drive để kéo thả tệp và lấy link chia sẻ dán vào hệ thống.
                        </p>
                      </div>
                    </label>
                  </div>
                </>
              ) : (
                /* Tab 2: Thư mục theo môn học */
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px] text-slate-600">
                    <span>
                      Tùy chọn: Bạn có thể cài đặt đường dẫn thư mục Google Drive riêng cho từng môn học. Nếu để trống, hệ thống sẽ tự động dùng thư mục chung của trường ở mục 1.
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {subjects.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="font-semibold text-slate-800">{s.name}</span>
                            {s.code && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                                {s.code}
                              </span>
                            )}
                          </div>
                          {subjectFolders[s.id] && (
                            <button
                              type="button"
                              onClick={() => handleTestLink(subjectFolders[s.id])}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 text-[11px] cursor-pointer"
                            >
                              <span>Mở link môn</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <input
                          type="url"
                          value={subjectFolders[s.id] || ''}
                          onChange={(e) => handleSubjectFolderChange(s.id, e.target.value)}
                          placeholder={`Đường dẫn Google Drive riêng cho môn ${s.name} (Để trống nếu dùng thư mục chung)...`}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            * Thay đổi có hiệu lực tức thì cho toàn bộ giáo viên trong trường
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-semibold transition cursor-pointer text-xs"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="drive-config-form"
              disabled={submitting || loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs transition cursor-pointer text-xs disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu cấu hình...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Lưu Cấu Hình Google Drive</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
