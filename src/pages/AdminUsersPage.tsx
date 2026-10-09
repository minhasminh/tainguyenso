import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { departmentService } from '../services/departmentService';
import { subjectService } from '../services/subjectService';
import { auditLogService } from '../services/auditLogService';
import { realtimeService } from '../services/realtimeService';
import { ensureSupabaseConfigLoaded } from '../lib/supabase/client';
import { useToast } from '../hooks/useToast';
import { UserAvatar } from '../components/UserAvatar';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { getRoleInfo, getStatusInfo, formatDateTime } from '../utils/formatters';
import { Profile, Department, Subject, UserRole, UserStatus } from '../types';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Shield,
  Lock,
  Unlock,
  Edit2,
  Eye,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Key,
  Copy,
  Check,
  EyeOff,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { ExcelImportUsersModal } from '../components/users/ExcelImportUsersModal';

// Secure random password generator helper
const generateSecurePassword = (prefix = 'GiaoVien'): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz@#$!';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}@${randomPart}`;
};

export function AdminUsersPage() {
  const { profile: callerProfile, role: callerRole, refreshProfile } = useAuth();
  const toast = useToast();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals state
  const [viewingUser, setViewingUser] = useState<Profile | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [lockTarget, setLockTarget] = useState<Profile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Password Management States for Create
  const [createPassword, setCreatePassword] = useState(() => generateSecurePassword('GiaoVien'));
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Password Management States for Edit / Re-issue
  const [isReissuingPassword, setIsReissuingPassword] = useState(false);
  const [editNewPassword, setEditNewPassword] = useState('');
  const [showEditNewPassword, setShowEditNewPassword] = useState(false);
  const [reissueDirectLoading, setReissueDirectLoading] = useState(false);

  // Quick Reset Modal from Table
  const [quickResetTarget, setQuickResetTarget] = useState<Profile | null>(null);
  const [quickResetPassword, setQuickResetPassword] = useState('');
  const [showQuickResetPassword, setShowQuickResetPassword] = useState(false);
  const [quickResetLoading, setQuickResetLoading] = useState(false);

  // Success Feedback Modals
  const [createdAccountModal, setCreatedAccountModal] = useState<{
    full_name: string;
    email: string;
    password: string;
    role: UserRole;
    departmentName?: string;
    subjectName?: string;
  } | null>(null);

  const [resetSuccessModal, setResetSuccessModal] = useState<{
    full_name: string;
    email: string;
    password: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Delete User state (Admin only)
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Form states for Edit / Create
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    department_id: '',
    subject_id: '',
    role: 'TEACHER' as UserRole,
    status: 'active' as UserStatus,
  });

  const isAdmin = callerRole === 'ADMIN' || callerProfile?.role === 'ADMIN';
  const isSchoolAdmin =
    callerRole === 'SCHOOL_ADMIN' ||
    callerProfile?.role === 'SCHOOL_ADMIN';
  const canManageUsers = isAdmin || isSchoolAdmin;

  if (!canManageUsers) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-xl mx-auto mt-12">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Không có quyền truy cập</h2>
        <p className="text-sm text-slate-500 mt-2">
          Chức năng Quản lý Giáo viên chỉ dành cho Quản trị viên (ADMIN) và Hiệu trưởng (SCHOOL_ADMIN). Tài khoản Phó hiệu trưởng không được cấp quyền quản lý người dùng.
        </p>
        <a
          href="#/"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition cursor-pointer"
        >
          Quay lại Bảng điều khiển
        </a>
      </div>
    );
  }

  // Load profiles, departments, subjects
  const loadData = async () => {
    setLoading(true);
    try {
      await ensureSupabaseConfigLoaded();
      const [users, depts, subs] = await Promise.all([
        userService.getProfiles(callerProfile),
        departmentService.getDepartments(callerProfile),
        subjectService.getSubjects(callerProfile),
      ]);
      setProfiles(users);
      setDepartments(depts);
      setSubjects(subs);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime profile updates across devices and tabs
    const unsubscribe = realtimeService.subscribeToTable('profiles', () => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [callerProfile]);

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.full_name.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q));

      // Department filter
      const matchDept =
        selectedDepartment === 'all' || p.department_id === selectedDepartment;

      // Subject filter
      const matchSub =
        selectedSubject === 'all' || p.subject_id === selectedSubject;

      // Role filter
      const matchRole =
        selectedRole === 'all' || p.role === selectedRole;

      // Status filter
      const matchStatus =
        selectedStatus === 'all' || p.status === selectedStatus;

      return matchSearch && matchDept && matchSub && matchRole && matchStatus;
    });
  }, [profiles, searchQuery, selectedDepartment, selectedSubject, selectedRole, selectedStatus]);

  // Clipboard Copy Helper
  const copyToClipboard = (text: string, keyId: string, label = 'mật khẩu') => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2500);
      toast.success(`Đã sao chép ${label} vào bộ nhớ tạm!`);
    } catch {
      toast.error('Không thể tự động sao chép. Vui lòng chọn và sao chép thủ công.');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name,
      email: user.email || '',
      department_id: user.department_id || '',
      subject_id: user.subject_id || '',
      role: user.role,
      status: user.status,
    });
    setIsReissuingPassword(false);
    setEditNewPassword(generateSecurePassword('Gv'));
    setShowEditNewPassword(false);
  };

  // Direct Re-issue inside Edit Modal
  const handleDirectReissueInEdit = async () => {
    if (!editingUser) return;
    const pwd = editNewPassword.trim();
    if (!pwd || pwd.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    setReissueDirectLoading(true);
    try {
      await userService.resetPassword(editingUser.id, pwd, callerProfile);
      toast.success(`Đã cấp lại mật khẩu thành công cho ${editingUser.full_name}!`);
      setResetSuccessModal({
        full_name: editingUser.full_name,
        email: editingUser.email || '',
        password: pwd,
      });
      setIsReissuingPassword(false);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cấp lại mật khẩu.');
    } finally {
      setReissueDirectLoading(false);
    }
  };

  // Quick role change directly from user table
  const handleQuickChangeRole = async (user: Profile, newRole: UserRole) => {
    if (user.role === newRole) return;
    if (!isAdmin && (newRole === 'ADMIN' || user.role === 'ADMIN')) {
      toast.error('Chỉ Quản trị viên (ADMIN) mới có quyền bổ nhiệm hoặc chỉnh sửa vai trò Quản trị viên.');
      return;
    }
    setActionLoading(true);
    try {
      await userService.updateProfile(user.id, { role: newRole }, callerProfile);
      toast.success(`Đã cập nhật vai trò của ${user.full_name} thành ${getRoleInfo(newRole).label}!`);
      await loadData();
      if (user.id === callerProfile?.id && refreshProfile) {
        await refreshProfile();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật vai trò.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Edit with Optional Password Re-issue
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (isReissuingPassword && (!editNewPassword.trim() || editNewPassword.trim().length < 6)) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    setActionLoading(true);

    try {
      const updates: Partial<Profile> = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        department_id: formData.department_id || null,
        subject_id: formData.subject_id || null,
      };

      if (canManageUsers) {
        if (!isAdmin && formData.role === 'ADMIN' && editingUser.role !== 'ADMIN') {
          toast.error('Chỉ Quản trị viên (ADMIN) mới có quyền bổ nhiệm vai trò Quản trị viên.');
          return;
        }
        updates.role = formData.role;
        updates.status = formData.status;
      }

      await userService.updateProfile(editingUser.id, updates, callerProfile);

      let resetPwdMsg = '';
      const pwdToSave = isReissuingPassword ? editNewPassword.trim() : '';

      if (pwdToSave) {
        await userService.resetPassword(editingUser.id, pwdToSave, callerProfile);
        resetPwdMsg = ' và đã cấp lại mật khẩu mới';
      }

      toast.success(`Cập nhật thông tin và phân quyền${resetPwdMsg} thành công!`);
      const targetUser = { ...editingUser, ...updates };
      setEditingUser(null);
      await loadData();

      if (editingUser.id === callerProfile?.id && refreshProfile) {
        await refreshProfile();
      }

      if (pwdToSave) {
        setResetSuccessModal({
          full_name: targetUser.full_name,
          email: targetUser.email || '',
          password: pwdToSave,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật.');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Delete User Handler
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeletingUser(true);
    try {
      await userService.deleteProfile(deletingUser.id, callerProfile);
      toast.success(`Đã xóa vĩnh viễn tài khoản của ${deletingUser.full_name}`);
      setDeletingUser(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa tài khoản người dùng.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Quick Reset Modal from Table
  const handleOpenQuickReset = (user: Profile) => {
    setQuickResetTarget(user);
    setQuickResetPassword(generateSecurePassword('Gv'));
    setShowQuickResetPassword(false);
  };

  const handleConfirmQuickReset = async () => {
    if (!quickResetTarget) return;
    const pwd = quickResetPassword.trim();
    if (!pwd || pwd.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    setQuickResetLoading(true);
    try {
      await userService.resetPassword(quickResetTarget.id, pwd, callerProfile);
      toast.success(`Cấp lại mật khẩu thành công cho ${quickResetTarget.full_name}!`);
      const target = quickResetTarget;
      setQuickResetTarget(null);
      setResetSuccessModal({
        full_name: target.full_name,
        email: target.email || '',
        password: pwd,
      });
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Không thể cấp lại mật khẩu.');
    } finally {
      setQuickResetLoading(false);
    }
  };

  // Submit Create New User with Initial Password
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.email.trim()) {
      toast.error('Vui lòng điền họ tên và email.');
      return;
    }
    const finalPassword = createPassword.trim() || 'Giaovien@123';
    if (finalPassword.length < 6) {
      toast.error('Mật khẩu khởi tạo phải có tối thiểu 6 ký tự.');
      return;
    }

    setActionLoading(true);

    try {
      const created = await userService.createProfile(
        {
          full_name: formData.full_name.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
          status: formData.status,
          department_id: formData.department_id || null,
          subject_id: formData.subject_id || null,
        },
        callerProfile,
        finalPassword
      );

      const dept = departments.find((d) => d.id === formData.department_id);
      const sub = subjects.find((s) => s.id === formData.subject_id);

      toast.success('Tạo tài khoản giáo viên mới thành công!');
      setIsCreating(false);
      setFormData({
        full_name: '',
        email: '',
        department_id: '',
        subject_id: '',
        role: 'TEACHER',
        status: 'active',
      });
      setCreatePassword(generateSecurePassword('GiaoVien'));
      await loadData();

      // Show credentials modal for admin to copy and hand over
      setCreatedAccountModal({
        full_name: created.full_name,
        email: created.email || '',
        password: finalPassword,
        role: created.role,
        departmentName: dept?.name,
        subjectName: sub?.name,
      });
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo người dùng.');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Lock/Unlock (Soft Disable per Section XVII)
  const handleConfirmToggleLock = async () => {
    if (!lockTarget) return;
    setActionLoading(true);

    const newStatus: UserStatus = lockTarget.status === 'locked' ? 'active' : 'locked';

    try {
      await userService.updateStatus(lockTarget.id, newStatus, callerProfile);
      toast.success(
        newStatus === 'locked'
          ? `Đã khóa tài khoản của ${lockTarget.full_name}`
          : `Đã mở khóa tài khoản của ${lockTarget.full_name}`
      );
      setLockTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Không thể thay đổi trạng thái tài khoản.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDepartment('all');
    setSelectedSubject('all');
    setSelectedRole('all');
    setSelectedStatus('all');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Quản lý Người dùng & Phân quyền RBAC
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {profiles.length} tài khoản
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản trị danh sách cán bộ, giáo viên; phân vai trò và thực thi chính sách bảo mật Row Level Security
          </p>
        </div>

        {canManageUsers && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsExcelImportOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-200 transition cursor-pointer"
              title="Nhập danh sách giáo viên tự động từ file Excel (.xlsx, .xls)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Nhập từ Excel</span>
            </button>

            <button
              onClick={() => {
                setFormData({
                  full_name: '',
                  email: '',
                  department_id: '',
                  subject_id: '',
                  role: 'TEACHER',
                  status: 'active',
                });
                setIsCreating(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tạo người dùng mới</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar per Section XVI */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo họ tên hoặc email..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Department Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            >
              <option value="all">Tất cả Tổ</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            >
              <option value="all">Tất cả Bộ môn</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            >
              <option value="all">Tất cả Vai trò</option>
              <option value="ADMIN">Quản trị viên (ADMIN)</option>
              <option value="SCHOOL_ADMIN">Hiệu trưởng</option>
              <option value="VICE_PRINCIPAL">Phó hiệu trưởng</option>
              <option value="SUBJECT_LEADER">Tổ trưởng chuyên môn</option>
              <option value="VICE_SUBJECT_LEADER">Tổ phó chuyên môn</option>
              <option value="TEACHER">Giáo viên</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2 flex gap-1.5">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            >
              <option value="all">Tất cả Trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Chưa kích hoạt</option>
              <option value="locked">Bị khóa (Locked)</option>
            </select>

            <button
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer flex-shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Users Table per Section XVI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
            <span>Đang tải dữ liệu từ cơ sở dữ liệu...</span>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Không tìm thấy người dùng phù hợp</p>
            <p className="mt-1">Hãy thử thay đổi điều kiện tìm kiếm hoặc bộ lọc</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Họ tên & Email</th>
                  <th className="py-3 px-4">Tổ chuyên môn</th>
                  <th className="py-3 px-4">Bộ môn</th>
                  <th className="py-3 px-4">Vai trò (Role)</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProfiles.map((user) => {
                  const roleInfo = getRoleInfo(user.role);
                  const statusInfo = getStatusInfo(user.status);
                  const isSelf = user.id === callerProfile?.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition">
                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={user.full_name}
                            avatarUrl={user.avatar_url}
                            role={user.role}
                            size="sm"
                            showBadge
                          />
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {user.full_name}
                              {isSelf && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {user.department?.name || <span className="text-slate-400">—</span>}
                      </td>

                      {/* Subject */}
                      <td className="py-3 px-4 text-slate-600">
                        {user.subject?.name || <span className="text-slate-400">—</span>}
                      </td>

                      {/* Role Badge / Quick Select */}
                      <td className="py-3 px-4">
                        {canManageUsers && (isAdmin || user.role !== 'ADMIN') ? (
                          <div className="relative inline-block group">
                            <select
                              value={user.role}
                              disabled={actionLoading}
                              onChange={(e) => handleQuickChangeRole(user, e.target.value as UserRole)}
                              title="Nhấp để thay đổi vai trò phân cấp nhanh"
                              aria-label={`Thay đổi vai trò của ${user.full_name}`}
                              className={`text-[11px] font-bold py-1 pl-2.5 pr-6 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-2xs appearance-none bg-no-repeat bg-[right_6px_center] ${roleInfo.badgeClass}`}
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234b5563' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundSize: '12px 12px',
                              }}
                            >
                              <option value="TEACHER">Giáo viên</option>
                              <option value="VICE_SUBJECT_LEADER">Tổ phó CM</option>
                              <option value="SUBJECT_LEADER">Tổ trưởng CM</option>
                              <option value="VICE_PRINCIPAL">Phó Hiệu trưởng</option>
                              <option value="SCHOOL_ADMIN">Hiệu trưởng</option>
                              {isAdmin && <option value="ADMIN">Quản trị viên (ADMIN)</option>}
                            </select>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${roleInfo.badgeClass}`}>
                            {roleInfo.label}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}></span>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingUser(user)}
                            title="Xem chi tiết"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {(isAdmin || (callerRole === 'SCHOOL_ADMIN' && user.role !== 'ADMIN')) && (
                            <button
                              onClick={() => handleOpenQuickReset(user)}
                              title="Cấp lại mật khẩu đăng nhập"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          )}

                          {(isAdmin || (callerRole === 'SCHOOL_ADMIN' && user.role !== 'ADMIN')) && (
                            <button
                              onClick={() => handleOpenEdit(user)}
                              title="Chỉnh sửa thông tin & Phân quyền"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {isAdmin && !isSelf && (
                            <button
                              onClick={() => setLockTarget(user)}
                              title={user.status === 'locked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                user.status === 'locked'
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-rose-600 hover:bg-rose-50'
                              }`}
                            >
                              {user.status === 'locked' ? (
                                <Unlock className="w-4 h-4" />
                              ) : (
                                <Lock className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {isAdmin && !isSelf && (
                            <button
                              onClick={() => setDeletingUser(user)}
                              title="Xóa vĩnh viễn tài khoản"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW USER DETAILS MODAL */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Chi tiết Hồ sơ Giáo viên</h3>
              <button
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 flex flex-col items-center text-center">
              <UserAvatar
                name={viewingUser.full_name}
                avatarUrl={viewingUser.avatar_url}
                role={viewingUser.role}
                size="lg"
                showBadge
              />
              <h4 className="font-bold text-slate-900 mt-2 text-base">{viewingUser.full_name}</h4>
              <p className="text-xs text-slate-500 font-mono">{viewingUser.email}</p>

              <div className="w-full mt-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Vai trò:</span>
                  <span className="font-bold text-indigo-700">{getRoleInfo(viewingUser.role).label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Trạng thái:</span>
                  <span className="font-semibold text-slate-800">{getStatusInfo(viewingUser.status).label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Tổ chuyên môn:</span>
                  <span className="font-medium text-slate-800">{viewingUser.department?.name || 'Chưa gán'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Bộ môn:</span>
                  <span className="font-medium text-slate-800">{viewingUser.subject?.name || 'Chưa gán'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Ngày tạo:</span>
                  <span className="text-slate-700">{formatDateTime(viewingUser.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / ROLE ASSIGNMENT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">
                Chỉnh sửa thông tin & Phân quyền ({editingUser.full_name})
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Địa chỉ Email</span>
                  <span className="text-[11px] text-slate-400 font-normal">Dùng để đăng nhập hệ thống</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ví dụ: giaovien@thcs.edu.vn"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tổ chuyên môn</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Chưa phân bổ --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bộ môn giảng dạy</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Chưa phân bổ --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* RBAC Role & Status (Editable for ADMIN and SCHOOL_ADMIN / VICE_PRINCIPAL) */}
              {canManageUsers ? (
                <div className="pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-indigo-600" />
                        Vai trò (RBAC)
                      </label>
                      <select
                        value={formData.role}
                        disabled={!isAdmin && editingUser.role === 'ADMIN'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                        className="w-full px-3 py-2 bg-indigo-50/40 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="TEACHER">Giáo viên (TEACHER)</option>
                        <option value="VICE_SUBJECT_LEADER">Tổ phó chuyên môn</option>
                        <option value="SUBJECT_LEADER">Tổ trưởng chuyên môn</option>
                        <option value="VICE_PRINCIPAL">Phó hiệu trưởng (VICE_PRINCIPAL)</option>
                        <option value="SCHOOL_ADMIN">Hiệu trưởng (SCHOOL_ADMIN)</option>
                        {isAdmin && <option value="ADMIN">Quản trị viên (ADMIN)</option>}
                      </select>
                      {!isAdmin && editingUser.role === 'ADMIN' && (
                        <p className="text-[10px] text-amber-600 mt-1">
                          * Chỉ Quản trị viên hệ thống mới có thể chỉnh sửa tài khoản ADMIN.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Trạng thái tài khoản</label>
                      <select
                        value={formData.status}
                        disabled={!isAdmin && editingUser.role === 'ADMIN'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <option value="active">Đang hoạt động (active)</option>
                        <option value="inactive">Chưa kích hoạt (inactive)</option>
                        {isAdmin && <option value="locked">Bị khóa (locked)</option>}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-[11px]">
                  <strong>Lưu ý:</strong> Bạn chỉ có quyền xem phân cấp vai trò.
                </div>
              )}

              {/* RE-ISSUE PASSWORD SECTION */}
              {(isAdmin || (callerRole === 'SCHOOL_ADMIN' && editingUser.role !== 'ADMIN')) && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/40 rounded-xl p-3 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Key className="w-4 h-4 text-amber-600" />
                        <span>Cấp lại mật khẩu đăng nhập</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !isReissuingPassword;
                          setIsReissuingPassword(nextState);
                          if (nextState && !editNewPassword) {
                            setEditNewPassword(generateSecurePassword('Gv'));
                          }
                        }}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer border ${
                          isReissuingPassword
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {isReissuingPassword ? 'Hủy đặt lại mật khẩu' : 'Đặt mật khẩu mới'}
                      </button>
                    </div>

                    {isReissuingPassword ? (
                      <div className="mt-2.5 pt-2.5 border-t border-amber-200/80 space-y-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-slate-700">Mật khẩu mới (tối thiểu 6 ký tự)</span>
                            <button
                              type="button"
                              onClick={() => setEditNewPassword(generateSecurePassword('Gv'))}
                              className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Tạo ngẫu nhiên
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type={showEditNewPassword ? 'text' : 'password'}
                              value={editNewPassword}
                              onChange={(e) => setEditNewPassword(e.target.value)}
                              placeholder="Nhập mật khẩu mới..."
                              className="w-full pl-3 pr-20 py-2 bg-white border border-amber-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setShowEditNewPassword(!showEditNewPassword)}
                                title={showEditNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                              >
                                {showEditNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(editNewPassword, 'edit_pwd', 'mật khẩu mới')}
                                title="Sao chép mật khẩu"
                                className="p-1 text-slate-500 hover:text-slate-800 rounded transition cursor-pointer"
                              >
                                {copiedKey === 'edit_pwd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="text-amber-800 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            Mật khẩu sẽ cập nhật khi bấm 'Lưu cập nhật' hoặc bấm cấp ngay:
                          </span>
                          <button
                            type="button"
                            disabled={reissueDirectLoading || !editNewPassword.trim()}
                            onClick={handleDirectReissueInEdit}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg font-semibold text-[11px] disabled:opacity-50 transition cursor-pointer shadow-xs"
                          >
                            {reissueDirectLoading ? 'Đang cấp...' : 'Cấp lại ngay'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Bật tùy chọn trên để tạo mật khẩu đăng nhập mới khi giáo viên quên mật khẩu hoặc cần reset định kỳ.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Đang lưu...' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW USER MODAL (ADMIN ONLY) */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                Tạo tài khoản giáo viên mới
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và tên giáo viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn Hùng"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email nhà trường cấp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="hung.nguyen@thcs.edu.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Initial Password for Teacher */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mật khẩu khởi tạo</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreatePassword(generateSecurePassword('GiaoVien'))}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Tạo mật khẩu ngẫu nhiên
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="GiaoVien@2026"
                    className="w-full pl-3 pr-20 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      title={showCreatePassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                    >
                      {showCreatePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createPassword, 'create_pwd', 'mật khẩu')}
                      title="Sao chép mật khẩu"
                      className="p-1 text-slate-500 hover:text-slate-800 rounded transition cursor-pointer"
                    >
                      {copiedKey === 'create_pwd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Mật khẩu tối thiểu 6 ký tự. Giáo viên sẽ dùng mật khẩu này để đăng nhập vào cổng tài nguyên số.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tổ chuyên môn</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Chưa chọn tổ --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bộ môn giảng dạy</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Chưa chọn môn --</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vai trò phân cấp</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="TEACHER">Giáo viên (TEACHER)</option>
                    <option value="VICE_SUBJECT_LEADER">Tổ phó chuyên môn</option>
                    <option value="SUBJECT_LEADER">Tổ trưởng chuyên môn</option>
                    <option value="VICE_PRINCIPAL">Phó hiệu trưởng</option>
                    <option value="SCHOOL_ADMIN">Hiệu trưởng</option>
                    {isAdmin && <option value="ADMIN">Quản trị viên (ADMIN)</option>}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng thái khởi tạo</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Kích hoạt ngay (active)</option>
                    <option value="inactive">Chưa kích hoạt (inactive)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Đang tạo...' : 'Tạo hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOCK / UNLOCK CONFIRMATION DIALOG (SECTION XVII) */}
      <ConfirmationDialog
        isOpen={Boolean(lockTarget)}
        title={lockTarget?.status === 'locked' ? 'Mở khóa tài khoản người dùng?' : 'Xác nhận khóa tài khoản người dùng?'}
        message={
          lockTarget?.status === 'locked'
            ? `Tài khoản ${lockTarget?.full_name} (${lockTarget?.email}) sẽ được phục hồi trạng thái hoạt động bình thường.`
            : `Khi bị khóa (soft disable), tài khoản ${lockTarget?.full_name} (${lockTarget?.email}) sẽ không thể đăng nhập hoặc thực hiện bất kỳ thao tác nào trên hệ thống.`
        }
        confirmText={lockTarget?.status === 'locked' ? 'Mở khóa ngay' : 'Khóa tài khoản'}
        isDestructive={lockTarget?.status !== 'locked'}
        onConfirm={handleConfirmToggleLock}
        onCancel={() => setLockTarget(null)}
        isLoading={actionLoading}
      />

      {/* DELETE USER CONFIRMATION MODAL (ADMIN ONLY) */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Xóa vĩnh viễn tài khoản người dùng</h3>
                <p className="text-[11px] text-slate-500">Hành động này không thể hoàn tác</p>
              </div>
              <button
                onClick={() => setDeletingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5">
                <div className="font-bold text-slate-900 text-sm">{deletingUser.full_name}</div>
                <div className="text-slate-600 font-mono text-xs">{deletingUser.email || 'Không có email'}</div>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleInfo(deletingUser.role).badgeClass}`}>
                    {getRoleInfo(deletingUser.role).label}
                  </span>
                  {deletingUser.department?.name && (
                    <span className="text-[11px] text-slate-600">
                      • {deletingUser.department.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Cảnh báo:</strong> Thao tác này sẽ xóa vĩnh viễn tài khoản khỏi hệ thống, thu hồi quyền đăng nhập, mật khẩu, và gỡ người dùng khỏi tổ chuyên môn.
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isDeletingUser}
                  onClick={() => setDeletingUser(null)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer font-medium"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeletingUser}
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeletingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xác nhận xóa tài khoản</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK RESET PASSWORD MODAL FROM TABLE */}
      {quickResetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <span>Cấp lại mật khẩu cho giáo viên</span>
              </h3>
              <button
                onClick={() => setQuickResetTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-semibold text-slate-900">{quickResetTarget.full_name}</div>
                <div className="text-slate-500 font-mono text-[11px]">{quickResetTarget.email}</div>
                <div className="pt-1 flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleInfo(quickResetTarget.role).badgeClass}`}>
                    {getRoleInfo(quickResetTarget.role).label}
                  </span>
                  {quickResetTarget.department?.name && (
                    <span className="text-[11px] text-slate-600">
                      • {quickResetTarget.department.name}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700">Mật khẩu mới</label>
                  <button
                    type="button"
                    onClick={() => setQuickResetPassword(generateSecurePassword('Gv'))}
                    className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Tạo ngẫu nhiên khác
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showQuickResetPassword ? 'text' : 'password'}
                    value={quickResetPassword}
                    onChange={(e) => setQuickResetPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    className="w-full pl-3 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowQuickResetPassword(!showQuickResetPassword)}
                      title={showQuickResetPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                    >
                      {showQuickResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(quickResetPassword, 'quick_pwd', 'mật khẩu')}
                      title="Sao chép mật khẩu"
                      className="p-1 text-slate-500 hover:text-slate-800 rounded transition cursor-pointer"
                    >
                      {copiedKey === 'quick_pwd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Mật khẩu mới sẽ có hiệu lực ngay lập tức. Hãy sao chép để gửi cho giáo viên.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuickResetTarget(null)}
                  className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer font-medium"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={quickResetLoading || !quickResetPassword.trim()}
                  onClick={handleConfirmQuickReset}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {quickResetLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang cấp lại...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>Xác nhận cấp lại</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATED ACCOUNT CREDENTIALS MODAL (HANDOVER CARD) */}
      {createdAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Tạo tài khoản giáo viên thành công!</h3>
                <p className="text-[11px] text-slate-500">Thông tin đăng nhập đã sẵn sàng để bàn giao</p>
              </div>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-900">{createdAccountModal.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tên đăng nhập (Email):</span>
                  <span className="font-mono font-semibold text-slate-800">{createdAccountModal.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mật khẩu khởi tạo:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {createdAccountModal.password}
                    </span>
                    <button
                      onClick={() => copyToClipboard(createdAccountModal.password, 'created_pwd', 'mật khẩu')}
                      title="Sao chép mật khẩu"
                      className="p-1 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                    >
                      {copiedKey === 'created_pwd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Vai trò hệ thống:</span>
                  <span className="font-semibold text-slate-700">{getRoleInfo(createdAccountModal.role).label}</span>
                </div>
                {createdAccountModal.departmentName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Tổ chuyên môn:</span>
                    <span className="text-slate-700">{createdAccountModal.departmentName}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Bàn giao tài khoản:</strong> Bạn có thể sao chép toàn bộ thông tin bên dưới để gửi tin nhắn hoặc thông báo qua Zalo/Email cho giáo viên.
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = [
                      `THÔNG TIN TÀI KHOẢN CỔNG TÀI NGUYÊN SỐ`,
                      `- Kính gửi: Thầy/Cô ${createdAccountModal.full_name}`,
                      `- Tên đăng nhập (Email): ${createdAccountModal.email}`,
                      `- Mật khẩu khởi tạo: ${createdAccountModal.password}`,
                      `- Vai trò: ${getRoleInfo(createdAccountModal.role).label}`,
                      `- Địa chỉ đăng nhập: ${window.location.origin}${window.location.pathname}#/login`,
                      `Vui lòng đăng nhập và bảo quản thông tin tài khoản được cấp.`,
                    ].join('\n');
                    copyToClipboard(text, 'created_all', 'toàn bộ thông tin tài khoản');
                  }}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition shadow-xs"
                >
                  {copiedKey === 'created_all' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Đã sao chép vào bộ nhớ tạm!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao chép toàn bộ thông tin đăng nhập</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCreatedAccountModal(null)}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer transition text-center"
                >
                  Xong & Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD SUCCESS FEEDBACK MODAL */}
      {resetSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Đã cấp lại mật khẩu mới!</h3>
                <p className="text-[11px] text-slate-500">Mật khẩu mới đã được cập nhật trên hệ thống</p>
              </div>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tài khoản:</span>
                  <span className="font-bold text-slate-900">{resetSuccessModal.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono text-slate-800">{resetSuccessModal.email}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Mật khẩu mới:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {resetSuccessModal.password}
                    </span>
                    <button
                      onClick={() => copyToClipboard(resetSuccessModal.password, 'reset_pwd', 'mật khẩu mới')}
                      title="Sao chép mật khẩu"
                      className="p-1 text-slate-500 hover:text-amber-700 rounded cursor-pointer"
                    >
                      {copiedKey === 'reset_pwd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = [
                      `THÔNG BÁO CẤP LẠI MẬT KHẨU`,
                      `- Kính gửi: Thầy/Cô ${resetSuccessModal.full_name}`,
                      `- Email: ${resetSuccessModal.email}`,
                      `- Mật khẩu mới: ${resetSuccessModal.password}`,
                      `- Đăng nhập tại: ${window.location.origin}${window.location.pathname}#/login`,
                    ].join('\n');
                    copyToClipboard(text, 'reset_all', 'thông tin mật khẩu mới');
                  }}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition shadow-xs"
                >
                  {copiedKey === 'reset_all' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Đã sao chép vào bộ nhớ tạm!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao chép thông tin gửi giáo viên</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setResetSuccessModal(null)}
                  className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer transition text-center"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT USERS MODAL */}
      <ExcelImportUsersModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        callerProfile={callerProfile}
        departments={departments}
        subjects={subjects}
        existingProfiles={profiles}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
