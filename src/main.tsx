import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@/styles/index.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { ToastProvider } from '@/components/toast';
import RouteFallback from '@/components/layout/RouteFallback';

// A code-split chunk (route/service module) can 404 when a new build has
// been deployed to the CDN while this tab still holds the OLD index.html —
// the old content-hashed filename no longer exists on the server. Vite
// fires this event for exactly that failure on a dynamic import(). Without
// this handler, the failed import throws into the nearest React error
// boundary, which has nothing to do with auth — but can look exactly like
// a forced logout to the user. Reload once to fetch the current build; a
// sessionStorage guard stops a reload loop if the failure isn't actually
// stale-chunk related (e.g. a real network outage).
window.addEventListener('vite:preloadError', () => {
  const key = 'tekxai:chunk-reload-attempted';
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Suspense fallback={<RouteFallback />}>
    <QueryClientProvider client={queryClient}>
      <ToastProvider position="top-right" darkMode={false}>
        <App />
      </ToastProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </Suspense>
);
