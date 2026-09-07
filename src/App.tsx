import React, { useEffect, Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import ErrorBoundary from '@/pages/ErrorBoundary';
import { router } from '@/routes/router';
import RouteFallback from '@/components/layout/RouteFallback';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { useProfileRefresh } from '@/hooks/useProfileRefresh';
import { useTheme } from '@/hooks/useTheme';
import { useColorMode } from '@/hooks/useColorMode';

const App: React.FC = () => {
  useTokenRefresh();
  useProfileRefresh();
  useTheme();
  useColorMode();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
