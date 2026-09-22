import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DesktopManagement from './index';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { API_ENDPOINTS } from '@/services/api/endpoints';

// Monitoring access (Grant/Force/Bulk-Force) — the real screenshot-visibility
// gate this page's "Access" column now surfaces, distinct from the
// pre-existing "Monitoring" column (self-reported OS telemetry only).

const INSTALLATIONS = [
  {
    id: 'inst-1', user_id: 'user-not-granted', current_version: '1.3.2', os: 'Windows', platform: 'win32',
    device: 'DESKTOP-1', channel: 'stable', last_seen_at: '2026-09-21T10:00:00.000Z', last_update_check_at: null,
    last_successful_update_at: null, force_update_requested_at: null, is_outdated: false,
    arch: 'x64', disk_free_gb: 100, disk_total_gb: 500, memory_total_gb: 16, memory_free_gb: 8,
    monitoring_permission_status: null, monitoring_capture_error: null,
    monitoring_access_status: 'NOT_GRANTED', monitoring_access_granted_by: null, has_screenshots: false,
    user: { id: 'user-not-granted', first_name: 'Huzaifa', last_name: 'Babar', email: 'huzaifa@fixture.test' },
  },
  {
    id: 'inst-2', user_id: 'user-granted', current_version: '1.3.2', os: 'Windows', platform: 'win32',
    device: 'DESKTOP-2', channel: 'stable', last_seen_at: '2026-09-21T10:00:00.000Z', last_update_check_at: null,
    last_successful_update_at: null, force_update_requested_at: null, is_outdated: false,
    arch: 'x64', disk_free_gb: 100, disk_total_gb: 500, memory_total_gb: 16, memory_free_gb: 8,
    monitoring_permission_status: 'GRANTED', monitoring_capture_error: null,
    monitoring_access_status: 'GRANTED', monitoring_access_granted_by: null, has_screenshots: true,
    user: { id: 'user-granted', first_name: 'Jane', last_name: 'Client', email: 'jane@fixture.test' },
  },
  {
    id: 'inst-3', user_id: 'user-force-granted', current_version: '1.3.2', os: 'Windows', platform: 'win32',
    device: 'DESKTOP-3', channel: 'stable', last_seen_at: '2026-09-21T10:00:00.000Z', last_update_check_at: null,
    last_successful_update_at: null, force_update_requested_at: null, is_outdated: false,
    arch: 'x64', disk_free_gb: 100, disk_total_gb: 500, memory_total_gb: 16, memory_free_gb: 8,
    monitoring_permission_status: null, monitoring_capture_error: null,
    monitoring_access_status: 'FORCE_GRANTED', monitoring_access_granted_by: 'Admin Person', has_screenshots: false,
    user: { id: 'user-force-granted', first_name: 'Ali', last_name: 'Raza', email: 'ali@fixture.test' },
  },
  {
    // Self-reported client telemetry says GRANTED, but zero screenshots have
    // actually landed — the Monitoring column must not trust that claim.
    id: 'inst-4', user_id: 'user-claims-granted-no-evidence', current_version: '1.3.3', os: 'Windows', platform: 'win32',
    device: 'DESKTOP-4', channel: 'stable', last_seen_at: '2026-09-21T10:00:00.000Z', last_update_check_at: null,
    last_successful_update_at: null, force_update_requested_at: null, is_outdated: false,
    arch: 'x64', disk_free_gb: 100, disk_total_gb: 500, memory_total_gb: 16, memory_free_gb: 8,
    monitoring_permission_status: 'GRANTED', monitoring_capture_error: null,
    // Force-granted (not NOT_GRANTED) so this fixture doesn't add a second
    // "Force Access" button and collide with the other tests below that
    // assume Huzaifa is the only NOT_GRANTED employee on the page.
    monitoring_access_status: 'FORCE_GRANTED', monitoring_access_granted_by: 'Admin Person', has_screenshots: false,
    user: { id: 'user-claims-granted-no-evidence', first_name: 'NoEvidence', last_name: 'Employee', email: 'noevidence@fixture.test' },
  },
];

// vi.mock factories are hoisted above the whole file, so the mock fn itself
// must be created via vi.hoisted rather than referenced from a later plain
// `const` — otherwise the factory closes over a not-yet-initialized binding
// (TDZ) the first time the real module import chain triggers it, which
// silently turns every apiRequest call into a thrown/undefined result
// instead of a clear test failure.
const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: (...args: any[]) => (apiRequestMock as any)(...args) };
});

apiRequestMock.mockImplementation(async (url: string) => {
  if (url === API_ENDPOINTS.DESKTOP.INSTALLATIONS) return { payload: { records: INSTALLATIONS, total: INSTALLATIONS.length, latest_version: '1.3.3' } };
  if (url === API_ENDPOINTS.DESKTOP.RELEASES) return { payload: { records: [] } };
  if (url === API_ENDPOINTS.DESKTOP.ANALYTICS) return { payload: null };
  if (url === API_ENDPOINTS.DESKTOP.CRASH_REPORTS) return { payload: { records: [] } };
  if (typeof url === 'string' && url.includes('monitoring-access')) return { message: 'OK', payload: { total_checked: 1, already_had_access: 0, newly_granted: 1, failed: 0 } };
  return { payload: null };
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <DesktopManagement />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Desktop Management — Access column', () => {
  it('renders Not Granted / Granted / Force Granted badges matching each employee\'s real access-grant state', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Huzaifa Babar')).toBeInTheDocument());

    expect(screen.getByText('Not Granted')).toBeInTheDocument();
    // 'Granted' also legitimately appears for Jane's separate Monitoring
    // column badge (real screenshot evidence, has_screenshots: true) — this
    // assertion only needs the AccessBadge's own "Granted" to exist
    // somewhere, not to be the only occurrence of that word on the page.
    expect(screen.getAllByText('Granted').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Force Granted').length).toBeGreaterThan(0);
  });

  it('Monitoring column shows "Granted" only when real screenshot evidence exists, ignoring the self-reported client claim', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('NoEvidence Employee')).toBeInTheDocument());

    // This employee's client self-reports monitoring_permission_status:
    // GRANTED, but has_screenshots is false — the Monitoring column
    // (5th cell) must show "—", not "Granted", regardless of that claim.
    const row = screen.getByText('NoEvidence Employee').closest('tr')!;
    const cells = row.querySelectorAll('td');
    expect(cells[4].textContent?.trim()).toBe('—');
  });

  it('shows Grant Access / Force Access buttons only for the employee without access', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Huzaifa Babar')).toBeInTheDocument());

    // Exactly one employee (Huzaifa) is NOT_GRANTED in the fixture, so
    // exactly one pair of action buttons should render.
    expect(screen.getAllByText('Grant Access')).toHaveLength(1);
    expect(screen.getAllByText('Force Access')).toHaveLength(1);
  });

  it('Grant Access calls the grant endpoint for that specific employee', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Huzaifa Babar')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Grant Access'));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      API_ENDPOINTS.DESKTOP.MONITORING_GRANT('user-not-granted'),
      expect.objectContaining({ method: 'POST' }),
    ));
  });

  it('Force Access opens a confirmation dialog before calling the force endpoint', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Huzaifa Babar')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Force Access'));

    // The confirmation dialog must appear (not an immediate silent grant).
    await waitFor(() => expect(screen.getByText('Force Monitoring Access?')).toBeInTheDocument());
    expect(apiRequestMock).not.toHaveBeenCalledWith(API_ENDPOINTS.DESKTOP.MONITORING_FORCE('user-not-granted'), expect.anything());

    fireEvent.click(screen.getByText('Yes, Force Access'));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      API_ENDPOINTS.DESKTOP.MONITORING_FORCE('user-not-granted'),
      expect.objectContaining({ method: 'POST' }),
    ));
  });

  it('page-level "Force Access to All Employees Without Access" opens a confirmation dialog before calling the bulk endpoint', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Huzaifa Babar')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Force Access to All Employees Without Access'));

    await waitFor(() => expect(screen.getByText('Force Access to All Employees Without Access?')).toBeInTheDocument());
    expect(apiRequestMock).not.toHaveBeenCalledWith(API_ENDPOINTS.DESKTOP.MONITORING_BULK_FORCE, expect.anything());

    fireEvent.click(screen.getByText('Force Access to All'));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      API_ENDPOINTS.DESKTOP.MONITORING_BULK_FORCE,
      expect.objectContaining({ method: 'POST' }),
    ));
  });
});
