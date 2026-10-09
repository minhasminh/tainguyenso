/**
 * QUẢN LÝ TÀI NGUYÊN SỐ GIÁO VIÊN
 * Single Page Application (SPA)
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppRouter } from './routes/router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UnconfiguredEnvScreen } from './components/UnconfiguredEnvScreen';
import { validateSupabaseEnv } from './lib/supabase';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';

export default function App() {
  const [bypassed, setBypassed] = useState<boolean>(() => {
    return sessionStorage.getItem('app_unconfigured_bypassed') === 'true';
  });
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Check if current path is a direct deployment check path
  const isDirectHealthCheck = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname;
    const hash = window.location.hash;
    return (
      path.includes('deployment-check') ||
      hash.includes('deployment-check') ||
      path.includes('settings/deployment') ||
      hash.includes('settings/deployment')
    );
  };

  const envValidation = validateSupabaseEnv();
  const shouldShowUnconfigured = !envValidation.isValid && !bypassed && !isDirectHealthCheck();

  const handleBypass = () => {
    sessionStorage.setItem('app_unconfigured_bypassed', 'true');
    setBypassed(true);
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        {shouldShowUnconfigured ? (
          <>
            <UnconfiguredEnvScreen
              onBypass={handleBypass}
              onOpenConfigModal={() => setConfigModalOpen(true)}
            />
            <SupabaseConfigModal
              isOpen={configModalOpen}
              onClose={() => setConfigModalOpen(false)}
            />
          </>
        ) : (
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        )}
      </ToastProvider>
    </ErrorBoundary>
  );
}
