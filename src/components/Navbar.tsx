import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Database,
  LogOut,
  User,
  ChevronDown,
  Sparkles,
  School,
  ShieldCheck,
  Search,
  ExternalLink,
  Command,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserAvatar } from './UserAvatar';
import { NotificationCenter } from './notifications/NotificationCenter';
import { getRoleInfo, getStatusInfo } from '../utils/formatters';
import { UserRole } from '../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenSupabaseConfig: () => void;
  onOpenRbacTester: () => void;
}

export function Navbar({ onToggleSidebar, onOpenSupabaseConfig, onOpenRbacTester }: NavbarProps) {
  const { user, profile, role, signOut, isLiveSupabase, switchDemoRole } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const roleInfo = getRoleInfo(role || profile?.role);
  const statusInfo = getStatusInfo(profile?.status);
  const isAdmin = (role || profile?.role) === 'ADMIN';

  // Global Ctrl+K / Cmd+K listener to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.hash = `#/resources?q=${encodeURIComponent(searchQuery.trim())}`;
    } else {
      window.location.hash = '#/resources';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-smooth">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Mobile Toggle & Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition lg:hidden cursor-pointer"
            title="Đóng/Mở thanh điều hướng"
          >
            <Menu className="w-5 h-5" />
          </button>

          <a href="#/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:shadow-sm transition-smooth shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm tracking-tight group-hover:text-blue-600 transition-colors">
                  Quản lý Tài nguyên số
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70">
                  EdTech
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Trường TH&THCS Nguyễn Đình Anh
              </p>
            </div>
          </a>
        </div>

        {/* Center: Global Search Bar with Ctrl+K shortcut */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4 hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tài nguyên, bài giảng, kế hoạch..."
              className="w-full pl-9 pr-14 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-500 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-100 transition-all shadow-2xs"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-400 font-mono pointer-events-none">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </form>
        </div>

        {/* Right: Quick Tools & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick RBAC Test button - Only for ADMIN */}
          {isAdmin && (
            <button
              onClick={onOpenRbacTester}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 transition-smooth shadow-2xs cursor-pointer"
              title="Kiểm tra các kịch bản phân quyền RBAC & RLS tự động"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden xl:inline">Kiểm thử RBAC</span>
              <span className="xl:hidden">RBAC</span>
            </button>
          )}

          {/* Supabase Status / Sandbox button - Only for ADMIN */}
          {isAdmin && (
            <button
              onClick={onOpenSupabaseConfig}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border transition-smooth shadow-2xs cursor-pointer ${
                isLiveSupabase
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
              title="Xem trạng thái kết nối Database, RLS và Migration SQL"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">
                {isLiveSupabase ? 'Supabase Live' : 'Database Sandbox'}
              </span>
            </button>
          )}

          {/* Quick Switch Role (for testing workflow permissions) */}
          <div className="relative">
            <button
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100/90 text-slate-700 hover:bg-slate-200/90 transition-smooth border border-slate-200/60 cursor-pointer"
              title="Đổi vai trò nhanh để kiểm tra các quyền phê duyệt và biên tập"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline text-slate-500 font-normal">Vai:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[90px] sm:max-w-none">
                {roleInfo.label}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {roleSwitcherOpen && (
              <div
                className="absolute right-0 mt-2 w-60 glass-dropdown rounded-2xl p-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setRoleSwitcherOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Chuyển nhanh vai trò thử nghiệm
                </div>
                {(['ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL', 'SUBJECT_LEADER', 'VICE_SUBJECT_LEADER', 'TEACHER'] as UserRole[]).map((r) => {
                  const info = getRoleInfo(r);
                  const isCurrent = (role || profile?.role) === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        switchDemoRole(r);
                        setRoleSwitcherOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-smooth cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{info.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{r}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notification Center */}
          <NotificationCenter />

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100/90 transition-smooth cursor-pointer"
              title="Tài khoản cá nhân"
            >
              <UserAvatar
                name={profile?.full_name || 'Giáo viên'}
                avatarUrl={profile?.avatar_url}
                role={role || profile?.role}
                size="sm"
                showBadge
              />
              <div className="hidden xl:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {profile?.full_name || 'Người dùng'}
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  {roleInfo.label}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 glass-dropdown rounded-2xl p-2 z-40 text-xs animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <div className="p-3 border-b border-slate-100 mb-1">
                  <div className="font-bold text-slate-900 text-sm leading-tight">
                    {profile?.full_name}
                  </div>
                  <div className="text-slate-500 text-[11px] truncate mt-0.5">
                    {profile?.email}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleInfo.badgeClass}`}>
                      {roleInfo.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.badgeClass}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                <a
                  href="#/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-smooth"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>Hồ sơ cá nhân</span>
                </a>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenSupabaseConfig();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-smooth cursor-pointer text-left"
                  >
                    <Database className="w-4 h-4 text-slate-500" />
                    <span>Cấu hình & Đồng bộ Database</span>
                  </button>
                )}

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-smooth cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-semibold">Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
