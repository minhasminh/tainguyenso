import React from 'react';
import {
  Home,
  Users,
  Building2,
  BookOpen,
  GraduationCap,
  CalendarDays,
  FolderArchive,
  Clock,
  PlusCircle,
  FolderOpen,
  BarChart3,
  X,
  Bell,
  Activity,
  Layers,
  FileSpreadsheet,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  School,
  Database,
  CheckCircle2,
  Settings,
  Server,
  User,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getRoleInfo } from '../utils/formatters';

interface SidebarProps {
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenSupabaseConfig?: () => void;
}

export function Sidebar({
  currentPath,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  onOpenSupabaseConfig,
}: SidebarProps) {
  const { role, profile } = useAuth();
  const userRole = role || profile?.role;
  const roleInfo = getRoleInfo(userRole);

  const isAdmin = userRole === 'ADMIN';
  const isPrincipal = userRole === 'SCHOOL_ADMIN';
  const isVicePrincipal = userRole === 'VICE_PRINCIPAL';
  const isSchoolAdmin = isPrincipal || isVicePrincipal;
  const isSubjectLeader = userRole === 'SUBJECT_LEADER';
  const isViceSubjectLeader = userRole === 'VICE_SUBJECT_LEADER';
  const isDepartmentLeader = isSubjectLeader || isViceSubjectLeader;
  const canManageUsers = isAdmin || isPrincipal;
  const canManageCurriculum = isAdmin || isSchoolAdmin || isDepartmentLeader;

  const isCurrentActive = (route: string) => {
    const clean = currentPath.split('?')[0];
    if (route === '/' || route === '/dashboard') {
      return clean === '/' || clean === '' || clean === '/dashboard';
    }
    return clean === route || clean.startsWith(route + '/');
  };

  // Primary Navigation (Section XIV)
  const primaryLinks = [
    {
      title: 'Dashboard',
      href: '#/dashboard',
      icon: Home,
      active: isCurrentActive('/dashboard'),
    },
    {
      title: 'Tài nguyên',
      href: '#/resources',
      icon: FolderArchive,
      active: isCurrentActive('/resources'),
    },
    {
      title: 'Phê duyệt',
      href: '#/approval',
      icon: CheckCircle2,
      active: isCurrentActive('/approval'),
      badge: 'Thẩm định',
    },
    {
      title: 'Thông báo',
      href: '#/notifications',
      icon: Bell,
      active: isCurrentActive('/notifications'),
    },
    {
      title: 'Nhật ký hoạt động',
      href: '#/activity-logs',
      icon: Activity,
      active: isCurrentActive('/activity-logs') || currentPath === '/admin/logs',
    },
    {
      title: 'Hồ sơ',
      href: '#/profile',
      icon: User,
      active: isCurrentActive('/profile'),
    },
    {
      title: 'Kiểm tra Deploy',
      href: '#/deployment-check',
      icon: Server,
      active: isCurrentActive('/deployment-check'),
      badge: 'Health',
    },
    {
      title: 'Cài đặt',
      href: '#/settings',
      icon: Settings,
      active: isCurrentActive('/settings'),
    },
  ];

  // Secondary Resource Actions
  const resourceSubLinks = [
    {
      title: 'Tài nguyên của tôi',
      href: '#/resources/my',
      icon: FolderOpen,
      active: currentPath === '/resources/my',
    },
    {
      title: 'Tải tài nguyên (Form)',
      href: '#/upload-resource',
      icon: UploadCloud,
      active: currentPath === '/upload-resource' || currentPath === '/resources/upload',
      badge: 'Nộp bài',
    },
    {
      title: 'Đăng tải trực tiếp',
      href: '#/resources/new',
      icon: PlusCircle,
      active: currentPath === '/resources/new',
    },
  ];

  // 3. THỐNG KÊ & BÁO CÁO
  const statisticsLinks = [
    {
      title: 'Báo cáo học liệu',
      href: '#/reports',
      icon: BarChart3,
      active: currentPath === '/reports',
    },
  ];

  // 4. THÔNG BÁO & HOẠT ĐỘNG
  const communicationLinks = [
    {
      title: 'Thông báo',
      href: '#/notifications',
      icon: Bell,
      active: currentPath === '/notifications',
    },
    {
      title: 'Nhật ký hoạt động',
      href: '#/activity-logs',
      icon: Activity,
      active: currentPath === '/activity-logs' || currentPath === '/admin/logs',
    },
  ];

  // 5. QUẢN TRỊ HỆ THỐNG
  const managementLinks = [
    ...(canManageUsers
      ? [
          {
            title: 'Quản lý Giáo viên',
            href: '#/admin/users',
            icon: Users,
            active: currentPath === '/admin/users',
          },
        ]
      : []),
    ...(canManageCurriculum
      ? [
          {
            title: 'Tổ chuyên môn',
            href: '#/admin/departments',
            icon: Building2,
            active: currentPath === '/admin/departments',
          },
          {
            title: 'Môn học',
            href: '#/admin/subjects',
            icon: BookOpen,
            active: currentPath === '/admin/subjects',
          },
        ]
      : []),
    ...(isAdmin || isSchoolAdmin
      ? [
          {
            title: 'Khối lớp',
            href: '#/admin/grades',
            icon: GraduationCap,
            active: currentPath === '/admin/grades',
          },
          {
            title: 'Niên khóa học',
            href: '#/admin/academic-years',
            icon: CalendarDays,
            active: currentPath === '/admin/academic-years',
          },
          {
            title: 'Loại học liệu',
            href: '#/admin/resource-types',
            icon: Layers,
            active: currentPath === '/admin/resource-types',
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            title: 'Cấu hình Google Form',
            href: '#/admin/google-form',
            icon: FileSpreadsheet,
            active: currentPath === '/admin/google-form',
          },
        ]
      : []),
  ];

  interface NavItem {
    title: string;
    href: string;
    icon: any;
    active: boolean;
    badge?: string;
  }

  const renderNavGroup = (title: string, items: NavItem[]) => {
    if (items.length === 0) return null;

    return (
      <div className="py-2">
        {!isCollapsed ? (
          <div className="px-3.5 mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {title}
          </div>
        ) : (
          <div className="w-8 mx-auto my-1 border-t border-slate-200/80" />
        )}
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={onClose}
                title={isCollapsed ? item.title : undefined}
                className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-smooth ${
                  item.active
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    item.active ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700'
                  }`}
                />
                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1">{item.title}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          item.active
                            ? 'bg-blue-200/70 text-blue-800'
                            : 'bg-slate-200/80 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-md">
                    {item.title}
                  </div>
                )}
              </a>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 bg-white border-r border-slate-200/90 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64 w-64'}`}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-4 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <School className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="font-bold text-slate-900 text-sm tracking-tight truncate leading-tight">
                  Tài nguyên số
                </div>
                <div className="text-[11px] text-blue-600 font-medium truncate leading-tight">
                  Trường TH&THCS
                </div>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Collapse toggle button on Desktop */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* User Card when expanded */}
        {!isCollapsed && (
          <div className="p-3 mx-3 mt-3 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/80">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Đang trực tuyến
              </span>
            </div>
            <div className="font-bold text-slate-900 text-xs truncate">
              {profile?.full_name || 'Đang tải thông tin...'}
            </div>
            <div className="text-[11px] text-slate-500 truncate mb-2">
              {profile?.email}
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleInfo.badgeClass}`}>
                {roleInfo.label}
              </span>
              <a
                href="#/profile"
                onClick={onClose}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Hồ sơ →
              </a>
            </div>
          </div>
        )}

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {renderNavGroup('Hệ thống', primaryLinks)}
          {renderNavGroup('Thao tác học liệu', resourceSubLinks)}
          {managementLinks.length > 0 && renderNavGroup('Quản trị trường học', managementLinks)}
        </div>

        {/* Footer info & DB helper */}
        <div className="p-3 border-t border-slate-200/80 text-center bg-slate-50/60">
          {!isCollapsed ? (
            <div>
              {isAdmin && onOpenSupabaseConfig && (
                <button
                  onClick={onOpenSupabaseConfig}
                  className="w-full mb-2 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-white border border-slate-200 transition shadow-2xs cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  <span>Trạng thái Cơ sở dữ liệu</span>
                </button>
              )}
              <p className="text-[10px] text-slate-400 font-medium">
                Trường TH&THCS Nguyễn Đình Anh • v2.1
              </p>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 font-bold">
              v2.1
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
