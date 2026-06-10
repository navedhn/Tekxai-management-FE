import React, { useEffect, Suspense, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import ErrorBoundary from '@/pages/ErrorBoundary';
import { router } from '@/routes/router';
import Loader from './components/ui/Loader';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';


const App: React.FC = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  useTokenRefresh();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Simulate initial app initialization/loading
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 300); // Quick initialization

    return () => clearTimeout(timer);
  }, []);

  if (isInitialLoading) {
    return <Loader fullPage />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <RouterProvider router={router} />
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;

