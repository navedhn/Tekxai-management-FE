import React, { useEffect, Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import ErrorBoundary from '@/pages/ErrorBoundary';
import { router } from '@/routes/router';
import RouteFallback from '@/components/layout/RouteFallback';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { useAuthChannel } from '@/hooks/useAuthChannel';
import { useProfileRefresh } from '@/hooks/useProfileRefresh';
import { useTheme } from '@/hooks/useTheme';
import { useColorMode } from '@/hooks/useColorMode';
import { usePortalMessageNotifications } from '@/hooks/usePortalMessageNotifications';
import { useNotificationRealtime } from '@/hooks/useNotificationRealtime';

const App: React.FC = () => {
  useTokenRefresh();
  useAuthChannel();
  useProfileRefresh();
  useTheme();
  useColorMode();
  usePortalMessageNotifications();
  useNotificationRealtime();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // A successful mount means this tab is now running the current build —
    // clear the guard from main.tsx's vite:preloadError handler so a LATER
    // stale-chunk failure (a subsequent deploy, same long-lived tab) still
    // gets one reload instead of being silently skipped.
    sessionStorage.removeItem('tekxai:chunk-reload-attempted');
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
