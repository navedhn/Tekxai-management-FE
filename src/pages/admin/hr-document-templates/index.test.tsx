import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HrDocumentTemplatesPage from './index';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { API_ENDPOINTS } from '@/services/api/endpoints';

// Covers two production bugs in the Edit Template modal:
//  1. Category / Document Type appeared uneditable (disabled selects) and
//     were dropped from the update payload even if enabled.
//  2. Clicking a placeholder button always appended the token to the end
//     of the content, ignoring the textarea's cursor/selection.

const CATEGORY_A = { id: 'cat-employment', code: 'employment', name: 'Employment' };
const CATEGORY_B = { id: 'cat-legal', code: 'legal', name: 'Legal' };
const TYPE_A = { id: 'type-offer', category_id: 'cat-employment', code: 'offer_letter', name: 'Offer Letter' };
const TYPE_B = { id: 'type-nda', category_id: 'cat-legal', code: 'nda', name: 'Non-Disclosure Agreement' };

const TEMPLATE = {
  id: 'tpl-1',
  category_id: 'cat-employment',
  type_id: 'type-offer',
  name: 'Job Offer Letter',
  is_active: true,
  requires_approval: false,
  current_version_id: 'v-1',
  current_version: { id: 'v-1', template_id: 'tpl-1', version: 4, content: 'Dear valued candidate, welcome aboard.', placeholders: [], created_at: '2026-01-01T00:00:00.000Z' },
  category: CATEGORY_A,
  type: TYPE_A,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: (...args: any[]) => (apiRequestMock as any)(...args) };
});

apiRequestMock.mockImplementation(async (url: string, opts: any = {}) => {
  if (url.startsWith(API_ENDPOINTS.HR_DOCUMENTS.CATEGORIES)) return { payload: [CATEGORY_A, CATEGORY_B] };
  if (url.startsWith(API_ENDPOINTS.HR_DOCUMENTS.TYPES)) {
    if (url.includes('cat-legal')) return { payload: [TYPE_B] };
    return { payload: [TYPE_A] };
  }
  if (url === API_ENDPOINTS.HR_DOCUMENTS.PLACEHOLDERS) {
    return { payload: { placeholders: [
      { token: 'employee_first_name', group: 'Employee', label: 'Employee first name' },
      { token: 'designation', group: 'Employment', label: 'Designation' },
    ], statuses: [], signer_roles: [] } };
  }
  if (url === API_ENDPOINTS.HR_DOCUMENTS.TEMPLATE_VERSIONS(TEMPLATE.id)) return { payload: [] };
  if (url.startsWith(API_ENDPOINTS.HR_DOCUMENTS.TEMPLATES) && (!opts.method || opts.method === 'GET')) return { payload: [TEMPLATE] };
  if (url === API_ENDPOINTS.HR_DOCUMENTS.TEMPLATE_UPDATE(TEMPLATE.id) && opts.method === 'PUT') {
    return { payload: { ...TEMPLATE, ...JSON.parse(opts.body) } };
  }
  return { payload: null };
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <HrDocumentTemplatesPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function openEditModal() {
  renderPage();
  await waitFor(() => expect(screen.getByText('Job Offer Letter')).toBeInTheDocument());
  fireEvent.click(screen.getByText('Edit'));
  await waitFor(() => expect(screen.getByText('Edit Template')).toBeInTheDocument());
  // Placeholder registry + document type list load asynchronously.
  await waitFor(() => expect(screen.getByText('{{employee_first_name}}')).toBeInTheDocument());
  await waitFor(() => expect(screen.getByDisplayValue('Offer Letter')).toBeInTheDocument());
}

describe('Document Templates — Edit Template modal', () => {
  it('Category and Document Type selects are enabled (not disabled) in edit mode', async () => {
    await openEditModal();
    const categorySelect = screen.getByDisplayValue('Employment') as HTMLSelectElement;
    expect(categorySelect.disabled).toBe(false);
  });

  it('the existing category/type are correctly pre-selected when opening Edit', async () => {
    await openEditModal();
    await waitFor(() => expect(screen.getByDisplayValue('Employment')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByDisplayValue('Offer Letter')).toBeInTheDocument());
  });

  it('changing Category and saving sends category_id in the update payload', async () => {
    await openEditModal();
    const categorySelect = screen.getByDisplayValue('Employment') as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: 'cat-legal' } });

    await waitFor(() => expect(screen.getByDisplayValue('Legal')).toBeInTheDocument());
    // Type resets when category changes — wait for the new type list to load, then select it.
    await waitFor(() => {
      const found = screen.getAllByRole('combobox').find((el) => (el as HTMLSelectElement).querySelector('option[value="type-nda"]'));
      expect(found).toBeTruthy();
    });
    const typeSelectEl = screen.getAllByRole('combobox').find((el) => (el as HTMLSelectElement).querySelector('option[value="type-nda"]')) as HTMLSelectElement;
    fireEvent.change(typeSelectEl, { target: { value: 'type-nda' } });

    fireEvent.click(screen.getByText('Save New Version'));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      API_ENDPOINTS.HR_DOCUMENTS.TEMPLATE_UPDATE(TEMPLATE.id),
      expect.objectContaining({ method: 'PUT', body: expect.stringContaining('"category_id":"cat-legal"') }),
    ));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      API_ENDPOINTS.HR_DOCUMENTS.TEMPLATE_UPDATE(TEMPLATE.id),
      expect.objectContaining({ body: expect.stringContaining('"type_id":"type-nda"') }),
    ));
  });

  it('placeholder click inserts the token at the tracked caret position, not appended at the end', async () => {
    await openEditModal();
    const textarea = screen.getByPlaceholderText(/Dear \{\{employee_name\}\}/) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Dear valued candidate, welcome aboard.');

    // Place caret right after "Dear " (position 5).
    textarea.focus();
    textarea.setSelectionRange(5, 5);
    fireEvent.select(textarea);

    fireEvent.click(screen.getByText('{{employee_first_name}}'));

    await waitFor(() => expect(textarea.value).toBe('Dear {{employee_first_name}}valued candidate, welcome aboard.'));
  });

  it('inserting a second placeholder after the first works at the new caret position (repeated insertion)', async () => {
    await openEditModal();
    const textarea = screen.getByPlaceholderText(/Dear \{\{employee_name\}\}/) as HTMLTextAreaElement;

    textarea.focus();
    textarea.setSelectionRange(0, 0);
    fireEvent.select(textarea);
    fireEvent.click(screen.getByText('{{employee_first_name}}'));
    await waitFor(() => expect(textarea.value).toBe('{{employee_first_name}}Dear valued candidate, welcome aboard.'));

    // Caret is tracked as right after the just-inserted token; insert again there.
    fireEvent.click(screen.getByText('{{designation}}'));
    await waitFor(() => expect(textarea.value).toBe('{{employee_first_name}}{{designation}}Dear valued candidate, welcome aboard.'));
  });

  it('inserting a placeholder over a selection replaces the selected text', async () => {
    await openEditModal();
    const textarea = screen.getByPlaceholderText(/Dear \{\{employee_name\}\}/) as HTMLTextAreaElement;

    // Select "valued candidate" (positions 5-21).
    textarea.focus();
    textarea.setSelectionRange(5, 21);
    fireEvent.select(textarea);

    fireEvent.click(screen.getByText('{{employee_first_name}}'));

    await waitFor(() => expect(textarea.value).toBe('Dear {{employee_first_name}}, welcome aboard.'));
  });
});
