import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { SupabaseConfigModal } from '../components/SupabaseConfigModal';
import { RbacTestModal } from '../components/RbacTestModal';
import { useAuth } from '../hooks/useAuth';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPath: string;
}

export function MainLayout({ children, currentPath }: MainLayoutProps) {
  const { role, profile } = useAuth();
  const isAdmin = (role || profile?.role) === 'ADMIN';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('thcs_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [rbacTestModalOpen, setRbacTestModalOpen] = useState(false);

  // Close mobile sidebar on path change
  useEffect(() => {
    setSidebarOpen(false);
  }, [currentPath]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('thcs_sidebar_collapsed', String(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 relative flex flex-col overflow-x-hidden">
      {/* Section 37: Subtle Ambient Background Glows for visual depth */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-10 right-10 w-96 h-96 bg-indigo-300/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Global Navbar Header */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onOpenSupabaseConfig={() => setSupabaseModalOpen(true)}
        onOpenRbacTester={() => setRbacTestModalOpen(true)}
      />

      <div className="flex-1 flex min-w-0">
        <Sidebar
          currentPath={currentPath}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
          onOpenSupabaseConfig={() => setSupabaseModalOpen(true)}
        />

        {/* Main Content Area (Max width 1440px with responsive sidebar offset) */}
        <main
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
            isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
          }`}
        >
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Database Sandbox / Migration Config Modal - Only for ADMIN */}
      {isAdmin && (
        <SupabaseConfigModal
          isOpen={supabaseModalOpen}
          onClose={() => setSupabaseModalOpen(false)}
        />
      )}

      {/* RBAC Automated Test Modal - Only for ADMIN */}
      {isAdmin && (
        <RbacTestModal
          isOpen={rbacTestModalOpen}
          onClose={() => setRbacTestModalOpen(false)}
        />
      )}
    </div>
  );
}
