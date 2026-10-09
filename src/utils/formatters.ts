import {
  UserRole,
  UserStatus,
  RoleInfo,
  ActivityAction,
  ResourceStatus,
  ResourceProvider,
} from '../types';

export function getRoleInfo(role?: UserRole): RoleInfo {
  switch (role) {
    case 'ADMIN':
      return {
        label: 'Quản trị viên',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        description: 'Toàn quyền quản trị hệ thống',
      };
    case 'SCHOOL_ADMIN':
      return {
        label: 'Hiệu trưởng',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
        description: 'Hiệu trưởng - Quản lý điều hành toàn trường & phê duyệt cấp trường',
      };
    case 'VICE_PRINCIPAL':
      return {
        label: 'Phó hiệu trưởng',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        description: 'Phó hiệu trưởng - Phụ trách chuyên môn & phê duyệt cấp trường',
      };
    case 'SUBJECT_LEADER':
      return {
        label: 'Tổ trưởng chuyên môn',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        description: 'Quản lý giáo viên và tài nguyên tổ chuyên môn',
      };
    case 'VICE_SUBJECT_LEADER':
      return {
        label: 'Tổ phó chuyên môn',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        description: 'Hỗ trợ quản lý chuyên môn và thẩm định tài nguyên tổ',
      };
    case 'TEACHER':
    default:
      return {
        label: 'Giáo viên',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        description: 'Thao tác trên tài nguyên của cá nhân',
      };
  }
}

export function getStatusInfo(status?: UserStatus): { label: string; badgeClass: string; dotClass: string } {
  switch (status) {
    case 'active':
      return {
        label: 'Đang hoạt động',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500',
      };
    case 'inactive':
      return {
        label: 'Chưa kích hoạt',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
      };
    case 'locked':
      return {
        label: 'Bị khóa',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        dotClass: 'bg-red-500',
      };
    default:
      return {
        label: 'Không xác định',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
      };
  }
}

export function getResourceStatusInfo(status: ResourceStatus): {
  label: string;
  badgeClass: string;
  dotClass: string;
  description: string;
} {
  switch (status) {
    case 'draft':
      return {
        label: 'Bản nháp',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        dotClass: 'bg-amber-500',
        description: 'Tài nguyên chưa gửi duyệt, chỉ hiển thị với tác giả',
      };
    case 'submitted':
      return {
        label: 'Chờ duyệt',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        dotClass: 'bg-blue-500',
        description: 'Đã gửi duyệt, đang chờ Tổ trưởng / BGH thẩm định',
      };
    case 'approved':
      return {
        label: 'Đã duyệt',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotClass: 'bg-emerald-500',
        description: 'Đã duyệt công khai cho toàn trường',
      };
    case 'rejected':
      return {
        label: 'Từ chối',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
        description: 'Tài nguyên không đạt yêu cầu thẩm định',
      };
    case 'rejected_by_subject_leader':
      return {
        label: 'Tổ trưởng từ chối',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
        description: 'Tổ trưởng chuyên môn từ chối duyệt',
      };
    case 'rejected_by_school':
      return {
        label: 'BGH từ chối',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        dotClass: 'bg-rose-500',
        description: 'Ban Giám hiệu từ chối duyệt',
      };
    case 'revision_required':
      return {
        label: 'Yêu cầu chỉnh sửa',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        dotClass: 'bg-orange-500',
        description: 'Cần cập nhật bổ sung theo nhận xét của Tổ trưởng',
      };
    case 'archived':
      return {
        label: 'Đã lưu trữ',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
        description: 'Tài nguyên đã đưa vào kho lưu trữ (không công khai)',
      };
    case 'subject_leader_approved':
      return {
        label: 'Tổ trưởng đã duyệt',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dotClass: 'bg-indigo-500',
        description: 'Chờ BGH phê duyệt chính thức',
      };
    case 'pending_school_approval':
      return {
        label: 'Chờ BGH duyệt',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        dotClass: 'bg-purple-500',
        description: 'Hồ sơ đã được chuyển tiếp đến Ban Giám hiệu',
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
        description: '',
      };
  }
}

export function detectResourceProvider(url: string): ResourceProvider {
  if (!url || typeof url !== 'string') return 'unknown';
  const clean = url.trim().toLowerCase();

  try {
    const parsed = new URL(clean);
    const host = parsed.hostname;
    const pathname = parsed.pathname;

    if (host.includes('drive.google.com')) {
      return 'google_drive';
    }
    if (host.includes('docs.google.com')) {
      if (pathname.includes('/document')) return 'google_docs';
      if (pathname.includes('/presentation')) return 'google_slides';
      if (pathname.includes('/spreadsheets')) return 'google_sheets';
      return 'google_drive';
    }
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      return 'youtube';
    }
    if (host.includes('canva.com')) {
      return 'canva';
    }
    if (
      host.includes('onedrive.live.com') ||
      host.includes('sharepoint.com') ||
      host.includes('1drv.ms')
    ) {
      return 'onedrive';
    }
    if (host.includes('dropbox.com')) {
      return 'dropbox';
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return 'website';
    }
  } catch {
    return 'unknown';
  }

  return 'unknown';
}

export function getProviderInfo(provider: ResourceProvider): {
  label: string;
  badgeClass: string;
  iconPrefix: string;
} {
  switch (provider) {
    case 'google_drive':
      return {
        label: 'Google Drive',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        iconPrefix: '🟢',
      };
    case 'google_docs':
      return {
        label: 'Google Docs',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        iconPrefix: '🔵',
      };
    case 'google_slides':
      return {
        label: 'Google Slides',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        iconPrefix: '🟠',
      };
    case 'google_sheets':
      return {
        label: 'Google Sheets',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        iconPrefix: '🟢',
      };
    case 'youtube':
      return {
        label: 'YouTube',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        iconPrefix: '🔴',
      };
    case 'canva':
      return {
        label: 'Canva',
        badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
        iconPrefix: '🟣',
      };
    case 'onedrive':
      return {
        label: 'OneDrive',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        iconPrefix: '🔵',
      };
    case 'dropbox':
      return {
        label: 'Dropbox',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        iconPrefix: '📦',
      };
    case 'website':
      return {
        label: 'Website',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        iconPrefix: '🌐',
      };
    default:
      return {
        label: 'Liên kết',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        iconPrefix: '🔗',
      };
  }
}

export function isValidResourceUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return Boolean(parsed.hostname && parsed.hostname.includes('.'));
  } catch {
    return false;
  }
}

export function getActionInfo(action: ActivityAction | string): { label: string; badgeClass: string } {
  switch (action) {
    case 'LOGIN':
      return { label: 'Đăng nhập', badgeClass: 'bg-blue-100 text-blue-800' };
    case 'LOGOUT':
      return { label: 'Đăng xuất', badgeClass: 'bg-slate-100 text-slate-800' };
    case 'PROFILE_UPDATE':
      return { label: 'Cập nhật hồ sơ', badgeClass: 'bg-teal-100 text-teal-800' };
    case 'USER_CREATE':
      return { label: 'Tạo tài khoản', badgeClass: 'bg-emerald-100 text-emerald-800' };
    case 'USER_UPDATE':
      return { label: 'Sửa thông tin', badgeClass: 'bg-indigo-100 text-indigo-800' };
    case 'PASSWORD_RESET':
      return { label: 'Cấp lại mật khẩu', badgeClass: 'bg-violet-100 text-violet-800' };
    case 'ROLE_CHANGE':
      return { label: 'Đổi vai trò (RBAC)', badgeClass: 'bg-amber-100 text-amber-800' };
    case 'STATUS_CHANGE':
      return { label: 'Đổi trạng thái', badgeClass: 'bg-rose-100 text-rose-800' };
    case 'CREATE_RESOURCE':
      return { label: 'Thêm tài nguyên', badgeClass: 'bg-emerald-100 text-emerald-800' };
    case 'RESOURCE_IMPORTED_FROM_GOOGLE_FORM':
      return { label: 'Nhận từ Google Form', badgeClass: 'bg-purple-100 text-purple-800' };
    case 'UPDATE_RESOURCE':
      return { label: 'Cập nhật tài nguyên', badgeClass: 'bg-indigo-100 text-indigo-800' };
    case 'DELETE_RESOURCE':
      return { label: 'Xóa tài nguyên', badgeClass: 'bg-rose-100 text-rose-800' };
    case 'ARCHIVE_RESOURCE':
      return { label: 'Lưu trữ tài nguyên', badgeClass: 'bg-slate-100 text-slate-800' };
    case 'SUBMIT_RESOURCE':
      return { label: 'Gửi duyệt tài nguyên', badgeClass: 'bg-blue-100 text-blue-800' };
    case 'VIEW_RESOURCE':
      return { label: 'Xem chi tiết', badgeClass: 'bg-cyan-100 text-cyan-800' };
    case 'COPY_RESOURCE_LINK':
      return { label: 'Sao chép liên kết', badgeClass: 'bg-purple-100 text-purple-800' };
    default:
      return { label: action, badgeClass: 'bg-gray-100 text-gray-800' };
  }
}

/**
 * Format datetime strictly according to Asia/Ho_Chi_Minh timezone
 * Requirement 6 & 7: dd/MM/yyyy HH:mm
 * Example: 22/09/2026 20:15
 */
export function formatVietnamDateTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    // Use Intl.DateTimeFormat with Asia/Ho_Chi_Minh timeZone
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const day = parts.find((p) => p.type === 'day')?.value || '00';
    const month = parts.find((p) => p.type === 'month')?.value || '00';
    const year = parts.find((p) => p.type === 'year')?.value || '0000';
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';

    return `${day}/${month}/${year} ${hour}:${minute}`;
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString?: string | null): string {
  return formatVietnamDateTime(isoString);
}

export const formatDateTimeVi = formatVietnamDateTime;

/**
 * Format date to Vietnamese format: dd/MM/yyyy
 */
export function formatVietnamDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

/**
 * Format file size in bytes to human readable (KB, MB, GB)
 */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const getStatusBadge = getResourceStatusInfo;


/**
 * Format relative time in Vietnamese (e.g., "5 phút trước", "Hôm qua lúc 14:30")
 */
export function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) {
      const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return `Hôm qua lúc ${timeStr}`;
    }
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return formatVietnamDateTime(isoString);
  } catch {
    return isoString;
  }
}

/**
 * Section 12: Thời gian xử lý phê duyệt
 * Format duration in hours to Vietnamese human-readable: "X ngày Y giờ", "X giờ Y phút", "X phút"
 */
export function formatDurationFromHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || isNaN(hours) || hours <= 0) {
    return 'Chưa đủ dữ liệu';
  }

  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} phút`;
  }

  const d = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  const remainingMinutes = Math.round((hours * 60) % 60);

  if (d >= 1) {
    if (remainingHours > 0) {
      return `${d} ngày ${remainingHours} giờ`;
    }
    return `${d} ngày`;
  }

  if (remainingMinutes > 0) {
    return `${remainingHours} giờ ${remainingMinutes} phút`;
  }

  return `${remainingHours} giờ`;
}

/**
 * Remove Vietnamese accents/diacritics for friendly search
 * e.g., "Tin học" -> "tin hoc", "Giáo án điện tử" -> "giao an dien tu"
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  // Some system encodes combining diacritics
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ''); // ̀ ́ ̃ ̉ ̣
  str = str.replace(/\u02C6|\u0306|\u031B/g, ''); // ˆ ̆ ̛  Â, Ê, Ă, Ơ, Ư
  return str;
}

/**
 * Checks whether haystack matches needle, ignoring case and diacritics
 */
export function vietnameseSearchMatches(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack || !needle) return false;
  const hLower = haystack.toLowerCase();
  const nLower = needle.toLowerCase();
  if (hLower.includes(nLower)) return true;

  // Unaccented match
  const hClean = removeVietnameseTones(hLower);
  const nClean = removeVietnameseTones(nLower);
  return hClean.includes(nClean);
}

/**
 * Normalizes a department name for duplicate checking and matching.
 * Removes leading "Tổ ", unifies hyphens/dashes, trims whitespace, and converts to lowercase.
 * e.g., "Tổ Khoa học tự nhiên" -> "khoa học tự nhiên"
 *       "Khoa học tự nhiên"    -> "khoa học tự nhiên"
 *       "Tổ Toán – Tin"        -> "toán - tin"
 *       "Toán - Tin"           -> "toán - tin"
 */
export function normalizeDepartmentName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/^tổ\s+/i, '')
    .replace(/[–—−-]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}


