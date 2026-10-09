export function translateSupabaseError(error: any): string {
  if (!error) return 'Đã xảy ra lỗi không xác định.';

  const message: string = typeof error === 'string' ? error : error.message || '';
  const code: string = error.code || '';

  // Only log detailed technical error for unexpected database/auth/system failures
  // Avoid logging known user-validation messages as severe traces
  const isValidationMessage =
    message.includes('đã tồn tại trong hệ thống') ||
    message.includes('không được để trống') ||
    message.includes('Vui lòng') ||
    message.startsWith('Tổ chuyên môn') ||
    message.startsWith('Môn học') ||
    message.startsWith('Khối lớp');

  if (!isValidationMessage && (code || message.includes('failed') || message.includes('Error'))) {
    console.error('[Database/Auth Error Trace]:', { code, message, error });
  }

  // Direct return for custom localized validation errors
  if (message.includes('đã tồn tại trong hệ thống')) {
    return message;
  }

  // RLS / Permission errors
  if (
    message.toLowerCase().includes('violates row-level security policy') ||
    message.toLowerCase().includes('row level security') ||
    code === '42501'
  ) {
    return 'Bạn không có quyền thực hiện thao tác này. Hệ thống Row Level Security (RLS) đã từ chối truy cập.';
  }

  // Custom trigger errors
  if (message.includes('Bạn không có quyền thay đổi vai trò')) {
    return 'Bạn không có quyền thay đổi vai trò tài khoản (Chỉ Quản trị viên hệ thống có quyền này).';
  }
  if (message.includes('Giáo viên không có quyền tự thay đổi')) {
    return 'Giáo viên không được tự ý đổi Tổ chuyên môn hoặc Bộ môn công tác.';
  }
  if (message.includes('Bạn không có quyền thay đổi trạng thái')) {
    return 'Bạn không có quyền thay đổi trạng thái hoạt động của tài khoản.';
  }

  // Supabase Auth errors
  if (message.includes('Invalid login credentials') || message.includes('invalid_grant')) {
    return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Email của bạn chưa được xác thực trong hệ thống.';
  }
  if (message.includes('User not found')) {
    return 'Email này chưa được đăng ký trong hệ thống trường học.';
  }
  if (message.includes('User already registered')) {
    return 'Tài khoản hoặc email này đã tồn tại trong hệ thống.';
  }

  // Unique constraint violations (PostgreSQL code 23505)
  if (code === '23505') {
    const lower = message.toLowerCase();
    if (lower.includes('departments') || lower.includes('department')) {
      return 'Tổ chuyên môn này đã tồn tại trong hệ thống. Vui lòng chọn tên khác.';
    }
    if (lower.includes('subjects') || lower.includes('subject')) {
      return 'Môn học này đã tồn tại trong hệ thống.';
    }
    if (lower.includes('grades') || lower.includes('grade')) {
      return 'Khối lớp này đã tồn tại trong hệ thống.';
    }
    if (lower.includes('resource_types') || lower.includes('resource_type')) {
      return 'Loại tài nguyên này đã tồn tại trong hệ thống.';
    }
    if (lower.includes('academic_years') || lower.includes('academic_year')) {
      return 'Năm học này đã tồn tại trong hệ thống.';
    }
    return 'Dữ liệu hoặc tài khoản này đã tồn tại trong hệ thống.';
  }

  if (message.includes('JWT expired') || message.includes('session_not_found')) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }

  // Network & Server errors
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.';
  }

  // Internal PostgreSQL / SQL Schema Sanitization (Do not leak relation or column names)
  const lowerMsg = message.toLowerCase();
  if (
    lowerMsg.includes('relation') ||
    lowerMsg.includes('syntax error') ||
    lowerMsg.includes('does not exist') ||
    lowerMsg.includes('foreign key constraint') ||
    lowerMsg.includes('column') ||
    lowerMsg.includes('table') ||
    code.startsWith('42') ||
    code.startsWith('28') ||
    code.startsWith('23')
  ) {
    return 'Không thể thực hiện thao tác cơ sở dữ liệu. Vui lòng thử lại sau hoặc liên hệ Quản trị viên.';
  }

  return message || 'Đã có lỗi xảy ra trong quá trình xử lý.';
}
