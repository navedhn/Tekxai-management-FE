import React, { useEffect, Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import ErrorBoundary from '@/pages/ErrorBoundary';
import { router } from '@/routes/router';
import { ToastProvider } from '@/components/ui/Toast';
import Loader from './components/ui/Loader';
import { texailogo } from './assets/icons';
import { LoaderPinwheel } from 'lucide-react';

const App: React.FC = () => {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            {/* Hidden SVG for gradient */}
            <svg width="0" height="0" className="absolute">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#005CDA" />
                  <stop offset="100%" stopColor="#001F4A" />
                </linearGradient>
              </defs>
            </svg>

            <div className="flex items-center justify-center gap-3">
              <LoaderPinwheel
                className="animate-spin"
                stroke="url(#gradient)"
                size={40}
              />

              {/* <img
                src={texailogo}
                className="w-[100px] h-[50px] object-contain"
                alt="logo"
              /> */}
            </div>
          </div>
        }>
          <RouterProvider router={router} />
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;

