import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { useToast } from '../hooks/useToast';
import { UserAvatar } from '../components/UserAvatar';
import { getRoleInfo, getStatusInfo, formatDateTime } from '../utils/formatters';
import {
  User,
  Mail,
  Building2,
  BookOpen,
  Shield,
  CheckCircle2,
  Lock,
  Loader2,
  Camera,
  Save,
  AlertTriangle,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();

  // Basic Profile Info state
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);

  const roleInfo = getRoleInfo(profile?.role);
  const statusInfo = getStatusInfo(profile?.status);

  // Save basic profile
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!fullName.trim()) {
      toast.error('Họ và tên không được để trống.');
      return;
    }

    setIsSaving(true);
    try {
      await userService.updateProfile(
        profile.id,
        {
          full_name: fullName.trim(),
          avatar_url: avatarUrl.trim() || null,
        },
        profile
      );

      await refreshProfile();
      toast.success('Cập nhật hồ sơ cá nhân thành công!');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật hồ sơ.');
    } finally {
      setIsSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    const trimmedNew = newPassword.trim();
    if (!trimmedNew || trimmedNew.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (trimmedNew !== confirmPassword.trim()) {
      toast.error('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    if (currentPassword === trimmedNew) {
      toast.error('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    setIsChangingPassword(true);
    setPasswordSuccessMessage(null);

    try {
      const res = await userService.changePassword(
        profile.id,
        currentPassword,
        trimmedNew,
        profile
      );

      toast.success('Đổi mật khẩu tài khoản thành công!');
      setPasswordSuccessMessage('Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      toast.error(err.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Password validation checks
  const isLengthValid = newPassword.length >= 6;
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferentFromCurrent = currentPassword.length > 0 && newPassword.length > 0 && newPassword !== currentPassword;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Hồ sơ cá nhân Giáo viên
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý thông tin cá nhân, cập nhật mật khẩu và xem vai trò, tổ chuyên môn được cấp bởi nhà trường
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar Card & Identity Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col items-center text-center">
            <div className="relative mb-4">
              <UserAvatar
                name={fullName || profile?.full_name || 'GV'}
                avatarUrl={avatarUrl || profile?.avatar_url}
                role={profile?.role}
                size="xl"
                showBadge
              />
            </div>

            <h2 className="text-lg font-bold text-slate-900">{profile?.full_name}</h2>
            <p className="text-xs text-slate-500 mb-4">{profile?.email}</p>

            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${roleInfo.badgeClass}`}>
                {roleInfo.label}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}>
                {statusInfo.label}
              </span>
            </div>

            <div className="w-full text-left pt-4 border-t border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã tài khoản:</span>
                <span className="font-mono text-slate-700 truncate max-w-[160px]" title={profile?.id}>
                  {profile?.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày tham gia:</span>
                <span className="text-slate-700 font-medium">
                  {formatDateTime(profile?.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cập nhật lần cuối:</span>
                <span className="text-slate-700 font-medium">
                  {formatDateTime(profile?.updated_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Security Tip Card */}
          <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/50 rounded-2xl border border-indigo-100 p-5 text-xs text-indigo-950 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-indigo-900">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Bảo mật tài khoản giáo viên</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Tài khoản được sử dụng để tải lên, lưu trữ giáo án và tham gia thẩm định học liệu số. Vui lòng định kỳ thay đổi mật khẩu và không chia sẻ cho người khác.
            </p>
          </div>
        </div>

        {/* Right Column: Editable Fields, Password Change, and System Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Basic Editable Information */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Thông tin cá nhân</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Cập nhật Họ tên hiển thị và URL ảnh đại diện cá nhân
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên giáo viên <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      URL Ảnh đại diện (Avatar)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Camera className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu thông tin cá nhân</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: CHANGE PASSWORD SECTION */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <span>Thay đổi mật khẩu đăng nhập</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Đổi mật khẩu định kỳ giúp tài khoản của Thầy/Cô luôn được bảo vệ an toàn
                </p>
              </div>
            </div>

            {passwordSuccessMessage && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{passwordSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu hiện tại <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordSuccessMessage(null);
                    }}
                    placeholder="Nhập mật khẩu đang sử dụng"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
                    title={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4 text-amber-600" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordSuccessMessage(null);
                      }}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
                      title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <ShieldCheck className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordSuccessMessage(null);
                      }}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
                      title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              {newPassword.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1.5 animate-in fade-in">
                  <div className="font-semibold text-slate-700 mb-1">Tiêu chuẩn mật khẩu:</div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isLengthValid ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'
                    }`}>
                      {isLengthValid ? '✓' : '•'}
                    </span>
                    <span className={isLengthValid ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                      Độ dài tối thiểu 6 ký tự
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isMatchValid ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'
                    }`}>
                      {isMatchValid ? '✓' : '•'}
                    </span>
                    <span className={isMatchValid ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                      Mật khẩu xác nhận trùng khớp
                    </span>
                  </div>
                  {currentPassword && (
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        isDifferentFromCurrent ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {isDifferentFromCurrent ? '✓' : '!'}
                      </span>
                      <span className={isDifferentFromCurrent ? 'text-emerald-700 font-medium' : 'text-rose-600'}>
                        {isDifferentFromCurrent ? 'Khác mật khẩu hiện tại' : 'Mật khẩu mới không được trùng mật khẩu cũ'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang cập nhật mật khẩu...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>Cập nhật mật khẩu mới</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 3: Non-editable System Fields per Section XXII */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Thông tin hệ thống quản lý (Bảo vệ RLS)</span>
              </h3>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                Chỉ Quản trị viên được thay đổi
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Giáo viên không được tự ý sửa Vai trò, Trạng thái, Tổ chuyên môn hoặc Bộ môn.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Địa chỉ Email đăng nhập
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.email || ''}
                  className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Vai trò hiện tại (Role)
                </label>
                <input
                  type="text"
                  disabled
                  value={`${roleInfo.label} (${profile?.role})`}
                  className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Tổ chuyên môn
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.department?.name || 'Chưa phân bổ'}
                  className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Bộ môn giảng dạy
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.subject?.name || 'Chưa phân bổ'}
                  className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium cursor-not-allowed select-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
