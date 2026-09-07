import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import { ToastProvider } from '@/components/toast/ToastProvider';
import EmployeeSetting from './index';

const apiRequestMock = vi.fn((endpoint: string) => {
  if (endpoint === API_ENDPOINTS.SETTINGS.ME) {
    return Promise.resolve({ success: true, payload: { show_notifications: true, language: 'en' } });
  }
  return Promise.resolve({ success: true, payload: {} });
});

vi.mock('@/lib/queryClient', () => ({
  apiRequest: (...args: any[]) => (apiRequestMock as any)(...args),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <EmployeeSetting />
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  apiRequestMock.mockClear();
  useAuthStore.setState({
    isLoggedIn: true,
    role: 'EMPLOYEE',
    user: { id: 'emp-1', first_name: 'Jane', last_name: 'Doe', avatar: null } as any,
  });
});

describe('Settings — avatar upload', () => {
  it('uploads via the dedicated employee avatar endpoint, not the generic /storage/upload', async () => {
    apiRequestMock.mockImplementation((endpoint: string) => {
      if (endpoint === API_ENDPOINTS.USER.AVATAR_UPLOAD('emp-1')) {
        return Promise.resolve({ success: true, payload: { id: 'emp-1', avatar: 'https://api.example.com/signed-new.jpg' } });
      }
      return Promise.resolve({ success: true, payload: {} });
    });

    renderPage();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(apiRequestMock.mock.calls.some(([endpoint]) => endpoint === API_ENDPOINTS.USER.AVATAR_UPLOAD('emp-1'))).toBe(true);
    });

    expect(apiRequestMock.mock.calls.some(([endpoint]) => endpoint === API_ENDPOINTS.STORAGE.UPLOAD)).toBe(false);
  });

  it('refreshes the displayed avatar after a successful upload', async () => {
    apiRequestMock.mockImplementation((endpoint: string) => {
      if (endpoint === API_ENDPOINTS.USER.AVATAR_UPLOAD('emp-1')) {
        return Promise.resolve({ success: true, payload: { id: 'emp-1', avatar: 'https://api.example.com/signed-new.jpg' } });
      }
      return Promise.resolve({ success: true, payload: {} });
    });

    renderPage();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(useAuthStore.getState().user?.avatar).toBe('https://api.example.com/signed-new.jpg');
    });
  });

  it('shows an error and does not update the avatar when the upload fails', async () => {
    apiRequestMock.mockImplementation((endpoint: string) => {
      if (endpoint === API_ENDPOINTS.USER.AVATAR_UPLOAD('emp-1')) {
        return Promise.reject({ status: 502, message: 'Failed to upload file to storage. Please try again or contact support.' });
      }
      return Promise.resolve({ success: true, payload: {} });
    });

    renderPage();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to upload file to storage/i)).toBeTruthy();
    });
    expect(useAuthStore.getState().user?.avatar).toBeNull();
  });
});
