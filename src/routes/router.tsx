import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleGuard } from '../components/RoleGuard';
import { MainLayout } from '../layouts/MainLayout';

// Pages
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { AdminDepartmentsPage } from '../pages/AdminDepartmentsPage';
import { AdminSubjectsPage } from '../pages/AdminSubjectsPage';
import { AdminGradesPage } from '../pages/AdminGradesPage';
import { AdminAcademicYearsPage } from '../pages/AdminAcademicYearsPage';
import { AdminResourceTypesPage } from '../pages/AdminResourceTypesPage';
import { ResourceListPage } from '../pages/ResourceListPage';
import { MyResourcesPage } from '../pages/MyResourcesPage';
import { NewResourcePage } from '../pages/NewResourcePage';
import { ResourceDetailPage } from '../pages/ResourceDetailPage';
import { EditResourcePage } from '../pages/EditResourcePage';
import { PublicResourcePage } from '../pages/PublicResourcePage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { ActivityLogsPage } from '../pages/ActivityLogsPage';
import { UploadResourcePage } from '../pages/UploadResourcePage';
import { AdminGoogleFormConfigPage } from '../pages/AdminGoogleFormConfigPage';
import { ApprovalPage } from '../pages/ApprovalPage';
import { SettingsPage } from '../pages/SettingsPage';
import { DeploymentCheckPage } from '../pages/DeploymentCheckPage';
import { DeploymentGuidePage } from '../pages/DeploymentGuidePage';

function getActiveAppPath(): string {
  if (typeof window === 'undefined') return '/';
  const hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    return hash.startsWith('/') ? hash : '/' + hash;
  }
  const path = window.location.pathname;
  return path || '/';
}

export function AppRouter() {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(getActiveAppPath);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(getActiveAppPath());
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const cleanPath = currentPath.split('?')[0];

  useEffect(() => {
    if (cleanPath === '/login' && !loading && user) {
      window.location.hash = '#/';
    }
  }, [cleanPath, loading, user]);

  // Deployment Check route (Chỉ hiển thị cho tài khoản Quản trị khi đã đăng nhập)
  if (cleanPath === '/deployment-check' || cleanPath === '/deployment-check.html') {
    if (user) {
      return (
        <ProtectedRoute>
          <RoleGuard allowedRoles={['ADMIN']}>
            <MainLayout currentPath={currentPath}>
              <DeploymentCheckPage />
            </MainLayout>
          </RoleGuard>
        </ProtectedRoute>
      );
    }
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
        <DeploymentCheckPage />
      </div>
    );
  }

  // Section 2 & 4: Public QR Code token scan route (Accessible by phone/scan without login for approved resources)
  const publicTokenMatch = currentPath.match(/^\/r\/([^/?#]+)$/);
  if (publicTokenMatch) {
    const token = publicTokenMatch[1];
    return <PublicResourcePage token={token} />;
  }

  // Public Auth Pages
  if (cleanPath === '/login') {
    if (!loading && user) {
      return null;
    }
    return <LoginPage />;
  }

  if (cleanPath === '/forgot-password') {
    return <ForgotPasswordPage />;
  }

  // Protected application routes
  return (
    <ProtectedRoute>
      <MainLayout currentPath={currentPath}>
        {renderProtectedPage(cleanPath)}
      </MainLayout>
    </ProtectedRoute>
  );
}

function renderProtectedPage(cleanPath: string) {
  // Check parameterized routes first
  const editMatch = cleanPath.match(/^\/resources\/([^/]+)\/edit$/);
  if (editMatch) {
    const resourceId = editMatch[1];
    return <EditResourcePage id={resourceId} />;
  }

  const detailMatch = cleanPath.match(/^\/resources\/([^/]+)$/);
  if (detailMatch && detailMatch[1] !== 'new' && detailMatch[1] !== 'my' && detailMatch[1] !== 'search') {
    const resourceId = detailMatch[1];
    return <ResourceDetailPage id={resourceId} />;
  }

  switch (cleanPath) {
    case '/':
    case '':
    case '/dashboard':
      return <DashboardPage />;

    case '/profile':
      return <ProfilePage />;

    // --- MODULE PHÊ DUYỆT (SECTION IV) ---
    case '/approval':
    case '/resources/approval':
      return <ApprovalPage />;

    // --- MODULE CÀI ĐẶT & DEPLOYMENT (SECTION IV, XII, XIII) ---
    case '/settings':
      return <SettingsPage />;

    case '/settings/deployment':
      return (
        <RoleGuard allowedRoles={['ADMIN']}>
          <DeploymentGuidePage />
        </RoleGuard>
      );

    case '/deployment-check':
      return (
        <RoleGuard allowedRoles={['ADMIN']}>
          <DeploymentCheckPage />
        </RoleGuard>
      );

    // --- MODULE TÀI NGUYÊN SỐ ---
    case '/resources':
    case '/resources/search':
      return <ResourceListPage />;

    case '/resources/my':
    case '/my-resources':
      return <MyResourcesPage />;

    case '/resources/new':
      return <NewResourcePage />;

    // --- GOOGLE FORM RESOURCE UPLOAD ---
    case '/upload-resource':
    case '/resources/upload':
      return <UploadResourcePage />;

    // --- NOTIFICATIONS MODULE ---
    case '/notifications':
      return <NotificationsPage />;

    // --- ACTIVITY LOGS & AUDIT LOGS ---
    case '/activity-logs':
    case '/admin/logs':
      return (
        <RoleGuard allowedRoles={['ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL', 'SUBJECT_LEADER', 'VICE_SUBJECT_LEADER', 'TEACHER']}>
          <ActivityLogsPage />
        </RoleGuard>
      );

    // --- PHÂN HỆ QUẢN TRỊ (ADMIN / BGH - MASTER DATA) ---
    case '/admin/users':
      return (
        <RoleGuard allowedRoles={['ADMIN', 'SCHOOL_ADMIN']}>
          <AdminUsersPage />
        </RoleGuard>
      );

    case '/admin/departments':
      return (
        <RoleGuard allowedRoles={['ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL', 'SUBJECT_LEADER', 'VICE_SUBJECT_LEADER']}>
          <AdminDepartmentsPage />
        </RoleGuard>
      );

    case '/admin/subjects':
      return (
        <RoleGuard allowedRoles={['ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL', 'SUBJECT_LEADER', 'VICE_SUBJECT_LEADER']}>
          <AdminSubjectsPage />
        </RoleGuard>
      );

    case '/admin/grades':
      return (
        <RoleGuard allowedRoles={['ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL']}>
          <AdminGradesPage />
        </RoleGuard>
      );

    case '/admin/academic-years':
      return (
        <RoleGuard allowedRoles={['ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL']}>
          <AdminAcademicYearsPage />
        </RoleGuard>
      );

    case '/admin/resource-types':
      return (
        <RoleGuard allowedRoles={['ADMIN', 'SCHOOL_ADMIN', 'VICE_PRINCIPAL']}>
          <AdminResourceTypesPage />
        </RoleGuard>
      );

    case '/admin/google-form':
      return (
        <RoleGuard allowedRoles={['ADMIN']}>
          <AdminGoogleFormConfigPage />
        </RoleGuard>
      );

    case '/reports':
      return <DashboardPage />;

    default:
      return <DashboardPage />;
  }
}

