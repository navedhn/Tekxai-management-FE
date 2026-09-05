import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Modal } from './index';
import { apiRequest } from '@/lib/queryClient';

// Regression test for the Designations "Add/Edit Designation" -> Department
// dropdown: previously a plain native <select> with no search (production
// bug report). Now backed by the shared SearchableSelect component — this
// exercises the real Modal component end to end, not the dropdown in
// isolation, so it also proves the existing payload/validation contract is
// unchanged.

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: vi.fn() };
});

const mockedApiRequest = vi.mocked(apiRequest);

const DEPARTMENTS = [
  { id: 'dept-eng', name: 'Engineering' },
  { id: 'dept-sales', name: 'Sales' },
  { id: 'dept-hr', name: 'Human Resources' },
  { id: 'dept-fin', name: 'Finance' },
];

function renderModal(props: { designation?: any; onClose?: () => void } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = props.onClose || vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <Modal designation={props.designation} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
}

beforeEach(() => {
  mockedApiRequest.mockReset();
  mockedApiRequest.mockResolvedValue({ payload: DEPARTMENTS });
});

// The Department field's SearchableSelect trigger is the second <button> in
// the DOM — the modal header's own close (X) button is the first — before
// Cancel/Save. Clicking by the trigger's own current label is ambiguous once
// open (the same label reappears as a list item, or as the freshly-selected
// trigger), so every test opens it this way instead.
const openDeptDropdown = () => fireEvent.click(screen.getAllByRole('button')[1]);

describe('Designations Modal — Department dropdown', () => {
  it('renders a search input for the Department dropdown (the reported bug)', async () => {
    renderModal();
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalled());
    openDeptDropdown();
    await waitFor(() => expect(screen.getByPlaceholderText('Search departments…')).toBeInTheDocument());
  });

  it('searching filters the department list', async () => {
    renderModal();
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalled());
    openDeptDropdown();
    await waitFor(() => expect(screen.getByText('Sales')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Search departments…'), { target: { value: 'sal' } });
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument();
    expect(screen.queryByText('Human Resources')).not.toBeInTheDocument();
  });

  it('selecting a department updates the displayed value', async () => {
    renderModal();
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalled());
    openDeptDropdown();
    await waitFor(() => expect(screen.getByText('Engineering')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Engineering'));
    // Closed dropdown now shows the selected department as the trigger label.
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search departments…')).not.toBeInTheDocument();
  });

  it('"Not department-specific" remains selectable and is the default for a new designation', async () => {
    renderModal();
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalled());
    expect(screen.getByText('Not department-specific')).toBeInTheDocument();
  });

  it('Edit Designation preserves the existing selected department', async () => {
    renderModal({ designation: { id: 'd1', name: 'Backend Developer', department_id: 'dept-hr', sort_order: 0 } });
    await waitFor(() => expect(screen.getByText('Human Resources')).toBeInTheDocument());
  });

  it('selecting "Not department-specific" again resets the department to null/empty in the saved payload', async () => {
    renderModal({ designation: { id: 'd1', name: 'Backend Developer', department_id: 'dept-hr', sort_order: 0 } });
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalled());

    mockedApiRequest.mockResolvedValueOnce({ success: true });
    openDeptDropdown();
    await waitFor(() => expect(screen.getAllByText('Not department-specific').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText('Not department-specific')[screen.getAllByText('Not department-specific').length - 1]);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      const updateCall = mockedApiRequest.mock.calls.find(([, opts]: any) => opts?.method === 'PUT');
      expect(updateCall).toBeTruthy();
      const body = JSON.parse((updateCall![1] as any).body);
      expect(body.department_id).toBeNull();
    });
  });

  it('existing form submission payload (name/department_id/sort_order) is unchanged on create', async () => {
    renderModal();
    await waitFor(() => expect(mockedApiRequest).toHaveBeenCalled());

    mockedApiRequest.mockResolvedValueOnce({ success: true });
    fireEvent.change(screen.getByPlaceholderText('e.g. Backend Developer'), { target: { value: 'QA Engineer' } });
    openDeptDropdown();
    await waitFor(() => expect(screen.getByText('Engineering')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Engineering'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      const createCall = mockedApiRequest.mock.calls.find(([, opts]: any) => opts?.method === 'POST');
      expect(createCall).toBeTruthy();
      const body = JSON.parse((createCall![1] as any).body);
      expect(body).toEqual({ name: 'QA Engineer', department_id: 'dept-eng', sort_order: 0 });
    });
  });
});
