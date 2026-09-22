import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScreenshotHistoryPanel from './ScreenshotHistoryPanel';

// Clicking a screenshot used to open a raw <a target="_blank"> to the file
// URL — a new browser tab exposing the presigned URL. It must now open an
// in-page lightbox with Prev/Next navigation instead, and never render an
// <a href> to the image.

const CAPTURED_AT_BASE = new Date('2026-09-22T10:00:00.000Z').getTime();
const SCREENSHOTS = [
  { id: 'shot-1', session_id: 's1', user_id: 'u1', file_key: 'k1', file_url: 'https://cdn.fixture.test/shot-1.png', monitor_index: 0, captured_at: new Date(CAPTURED_AT_BASE).toISOString(), user: { id: 'u1', first_name: 'Jane', last_name: 'Doe' } },
  { id: 'shot-2', session_id: 's1', user_id: 'u1', file_key: 'k2', file_url: 'https://cdn.fixture.test/shot-2.png', monitor_index: 0, captured_at: new Date(CAPTURED_AT_BASE + 60000).toISOString(), user: { id: 'u1', first_name: 'Jane', last_name: 'Doe' } },
  { id: 'shot-3', session_id: 's1', user_id: 'u1', file_key: 'k3', file_url: 'https://cdn.fixture.test/shot-3.png', monitor_index: 0, captured_at: new Date(CAPTURED_AT_BASE + 120000).toISOString(), user: { id: 'u1', first_name: 'Jane', last_name: 'Doe' } },
];

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: (...args: any[]) => (apiRequestMock as any)(...args) };
});

apiRequestMock.mockImplementation(async (url: string) => {
  if (typeof url === 'string' && url.includes('monitoring/screenshots')) {
    return { payload: { records: SCREENSHOTS, total: SCREENSHOTS.length } };
  }
  return { payload: null };
});

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ScreenshotHistoryPanel
        userOptions={[{ value: 'u1', label: 'Jane Doe' }]}
        selectedUser="u1"
        onSelectUser={() => {}}
        isSuperAdmin={false}
        onDeleteOne={() => {}}
      />
    </QueryClientProvider>,
  );
}

describe('ScreenshotHistoryPanel — in-page lightbox, not a new tab', () => {
  it('never renders an <a href> around a screenshot image', async () => {
    const { container } = renderPanel();
    await waitFor(() => expect(screen.getAllByAltText('Screenshot').length).toBe(3));
    expect(container.querySelector('a[href*="cdn.fixture.test"]')).toBeNull();
  });

  it('clicking a screenshot opens the in-page lightbox showing that image', async () => {
    renderPanel();
    const images = await waitFor(() => screen.getAllByAltText('Screenshot'));
    fireEvent.click(images[0]);

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Screenshot viewer' })).toBeInTheDocument());
    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });

  it('Next/Previous walk through the screenshots without closing the lightbox', async () => {
    renderPanel();
    const images = await waitFor(() => screen.getAllByAltText('Screenshot'));
    fireEvent.click(images[0]);
    await waitFor(() => expect(screen.getByText('1 of 3')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Next (→)'));
    await waitFor(() => expect(screen.getByText('2 of 3')).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Next (→)'));
    await waitFor(() => expect(screen.getByText('3 of 3')).toBeInTheDocument());
    // At the last screenshot, there's nothing further to go to.
    expect(screen.queryByTitle('Next (→)')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Previous (←)'));
    await waitFor(() => expect(screen.getByText('2 of 3')).toBeInTheDocument());
  });

  it('closes on the close button', async () => {
    renderPanel();
    const images = await waitFor(() => screen.getAllByAltText('Screenshot'));
    fireEvent.click(images[0]);
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Screenshot viewer' })).toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Close (Esc)'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Screenshot viewer' })).not.toBeInTheDocument());
  });

  it('closes on Escape key', async () => {
    renderPanel();
    const images = await waitFor(() => screen.getAllByAltText('Screenshot'));
    fireEvent.click(images[0]);
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Screenshot viewer' })).toBeInTheDocument());

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Screenshot viewer' })).not.toBeInTheDocument());
  });
});
