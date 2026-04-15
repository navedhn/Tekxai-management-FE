import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@/styles/index.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { ToastProvider } from '@/components/toast';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Suspense>
    <QueryClientProvider client={queryClient}>
      <ToastProvider position="top-right" darkMode={false}>
        <App />
      </ToastProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </Suspense>
);
