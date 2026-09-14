import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import DailyReportPage from './index';

let complianceStatus: any;
const apiRequestMock = vi.fn((endpoint: string) => {
  if (endpoint === API_ENDPOINTS.TIMESHEET.COMPLIANCE_STATUS) {
    return Promise.resolve({ success: true, payload: complianceStatus });
  }
  if (endpoint === API_ENDPOINTS.DAILY_PLANNING.AGENDA_TODAY) {
    return Promise.resolve({ success: true, payload: null });
  }
  if (endpoint === API_ENDPOINTS.DAILY_PLANNING.REPORT_TODAY) {
    return Promise.resolve({ success: true, payload: null });
  }
  if (endpoint === API_ENDPOINTS.PERFORMANCE.DAILY_REPORTS) {
    return Promise.resolve({ success: true, payload: { records: [] } });
  }
  return Promise.resolve({ success: true, payload: {} });
});

vi.mock('@/lib/queryClient', () => ({
  apiRequest: (...args: any[]) => (apiRequestMock as any)(...args),
}));

class FakeSocket {
  connected = true;
  listeners: Record<string, Array<(...args: any[]) => void>> = {};
  on(event: string, cb: (...args: any[]) => void) {
    (this.listeners[event] ||= []).push(cb);
  }
  off(event: string, cb: (...args: any[]) => void) {
    this.listeners[event] = (this.listeners[event] || []).filter((l) => l !== cb);
  }
  trigger(event: string, payload?: any) {
    (this.listeners[event] || []).forEach((cb) => cb(payload));
  }
}
let fakeSocket: FakeSocket;

vi.mock('@/lib/socket', () => ({
  getSocket: () => fakeSocket,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DailyReportPage />
    </QueryClientProvider>,
  );
}

describe('Daily Report page — attendance state synchronization via socket events', () => {
  beforeEach(() => {
    apiRequestMock.mockClear();
    fakeSocket = new FakeSocket();
    complianceStatus = { has_open_session: false, agenda_submitted: false, report_submitted: false };
    useAuthStore.setState({ user: { id: 'u1', designation: 'Backend Developer' } as any });
  });

  // Agenda/Report submission is available regardless of open-session state
  // (the backend never required one — see daily-planning.controller.js's
  // attendance_business_date, which explicitly falls back to today's date
  // when clocked out). So the "Hours Today" card's session subtext — not
  // the Agenda button — is what these tests use as their probe for "did the
  // socket event actually refetch compliance-status."
  const openSessionText = () => screen.queryByText('Open session');
  const noOpenSessionText = () => screen.queryByText('No open session');

  it('shows "No open session" while checked out', async () => {
    renderPage();
    await waitFor(() => expect(noOpenSessionText()).toBeInTheDocument());
  });

  it('receiving a presence:update check-in socket event refreshes session state without polling or a second Check In', async () => {
    renderPage();
    await waitFor(() => expect(noOpenSessionText()).toBeInTheDocument());

    const callsBeforeEvent = apiRequestMock.mock.calls.length;
    complianceStatus = { has_open_session: true, agenda_submitted: false, report_submitted: false };

    await act(async () => {
      fakeSocket.trigger('presence:update', { userId: 'u1', status: 'WORKING' });
    });

    await waitFor(() => {
      expect(openSessionText()).toBeInTheDocument();
    });
    expect(apiRequestMock.mock.calls.length).toBeGreaterThan(callsBeforeEvent);
  });

  it('ignores a presence:update event for a different user', async () => {
    renderPage();
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalled());
    complianceStatus = { has_open_session: true, agenda_submitted: false, report_submitted: false };

    await act(async () => {
      fakeSocket.trigger('presence:update', { userId: 'someone-else', status: 'WORKING' });
    });

    expect(noOpenSessionText()).toBeInTheDocument();
  });

  it('a Check Out presence event updates the page back to no-open-session', async () => {
    complianceStatus = { has_open_session: true, agenda_submitted: false, report_submitted: false };
    renderPage();
    await waitFor(() => {
      expect(openSessionText()).toBeInTheDocument();
    });

    complianceStatus = { has_open_session: false, agenda_submitted: false, report_submitted: false };
    await act(async () => {
      fakeSocket.trigger('presence:update', { userId: 'u1', status: 'ONLINE' });
    });

    await waitFor(() => {
      expect(noOpenSessionText()).toBeInTheDocument();
    });
  });

  it('Check In then Check Out then Check In again all reflect correctly via socket events', async () => {
    renderPage();
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalled());

    complianceStatus = { has_open_session: true, agenda_submitted: false, report_submitted: false };
    await act(async () => { fakeSocket.trigger('presence:update', { userId: 'u1', status: 'WORKING' }); });
    await waitFor(() => expect(openSessionText()).toBeInTheDocument());

    complianceStatus = { has_open_session: false, agenda_submitted: false, report_submitted: false };
    await act(async () => { fakeSocket.trigger('presence:update', { userId: 'u1', status: 'ONLINE' }); });
    await waitFor(() => expect(noOpenSessionText()).toBeInTheDocument());

    complianceStatus = { has_open_session: true, agenda_submitted: false, report_submitted: false };
    await act(async () => { fakeSocket.trigger('presence:update', { userId: 'u1', status: 'WORKING' }); });
    await waitFor(() => expect(openSessionText()).toBeInTheDocument());
  });

  it('a reconnect (app restart/network recovery) eventually reconciles attendance state', async () => {
    renderPage();
    await waitFor(() => expect(noOpenSessionText()).toBeInTheDocument());

    fakeSocket.connected = false;
    complianceStatus = { has_open_session: true, agenda_submitted: false, report_submitted: false };

    await act(async () => {
      fakeSocket.connected = true;
      fakeSocket.trigger('connect');
    });

    await waitFor(() => {
      expect(openSessionText()).toBeInTheDocument();
    });
  });

  it('reflects an already-open session correctly on initial load', async () => {
    complianceStatus = { has_open_session: true, agenda_submitted: false, report_submitted: false };
    renderPage();
    await waitFor(() => {
      expect(openSessionText()).toBeInTheDocument();
    });
  });

  it('Submit Today\'s Agenda and Submit Daily Report are both available while checked out', async () => {
    complianceStatus = { has_open_session: false, agenda_submitted: false, report_submitted: false };
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /Submit Today's Agenda/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Submit Daily Report/i })).toBeInTheDocument();
  });
});
