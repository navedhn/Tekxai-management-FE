import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmailWorkflowModal } from './index';
import { useGenerateOfferEmail, useEditOfferEmail, useSendOffer } from '@/services/onboardingService';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { ToastProvider } from '@/components/toast/ToastProvider';

// Task 2: Document Templates (hr_document_templates) must be selectable
// from the onboarding Offer Email flow, merged alongside the module's own
// recruitment_email_templates — not a duplicate template system.

const RECRUITMENT_TEMPLATE = { id: 'rec-tpl-1', name: 'Standard Offer' };
const DOC_TEMPLATE = { id: 'doc-tpl-1', name: 'Offer of Employment', category: { name: 'Employment' }, type: { name: 'Offer Letter' }, is_active: true };

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('@/lib/queryClient', async () => {
  const actual = await vi.importActual<any>('@/lib/queryClient');
  return { ...actual, apiRequest: (...args: any[]) => (apiRequestMock as any)(...args) };
});

apiRequestMock.mockImplementation(async (url: string, opts: any = {}) => {
  if (url.startsWith(`api/v1/recruitment/email-templates`)) return { payload: { records: [RECRUITMENT_TEMPLATE] } };
  if (url === API_ENDPOINTS.HR_DOCUMENTS.TEMPLATES) return { payload: [DOC_TEMPLATE] };
  if (url.includes('/email/generate') && opts.method === 'POST') {
    const body = JSON.parse(opts.body);
    if (body.template_id === DOC_TEMPLATE.id) {
      return { payload: { email_subject: 'Job Offer — Business Developer at TekXAI', letter_content: 'Dear Mehar, offer from Document Template.' } };
    }
    return { payload: { email_subject: 'Standard Offer Subject', letter_content: 'Dear Mehar, standard offer body.' } };
  }
  return { payload: null };
});

function renderModal(entity: any = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <EmailWorkflowModal
          title="Offer Email — Mehar Omar"
          templateType="OFFER"
          entity={{ id: 'offer-1', ...entity }}
          subjectField="email_subject"
          bodyField="letter_content"
          useGenerate={useGenerateOfferEmail}
          useEdit={useEditOfferEmail}
          useSend={useSendOffer}
          idFor={(e: any) => e.id}
          generateKey="offerId"
          editKey="offerId"
          onClose={() => {}}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Onboarding Offer Email — Document Templates integration', () => {
  it('the Select Template dropdown includes both recruitment and Document Templates offer templates', async () => {
    renderModal();
    // "Offer of Employment" alone also matches the default placeholder
    // option (TEMPLATE_TYPE_LABELS.OFFER) — wait on the suffix this
    // component only adds to a real merged Document Template entry.
    await waitFor(() => expect(screen.getByText(/Offer of Employment \(Document Template\)/)).toBeInTheDocument());
    expect(screen.getByText('Standard Offer')).toBeInTheDocument();
  });

  it('selecting the Document Template and generating uses that template', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText(/Offer of Employment \(Document Template\)/)).toBeInTheDocument());

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const docOption = Array.from(select.options).find((o) => o.textContent?.includes('(Document Template)'));
    fireEvent.change(select, { target: { value: docOption!.value } });
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      expect.stringContaining('/email/generate'),
      expect.objectContaining({ body: expect.stringContaining(`"template_id":"${DOC_TEMPLATE.id}"`) }),
    ));
    await waitFor(() => expect(screen.getByDisplayValue('Job Offer — Business Developer at TekXAI')).toBeInTheDocument());
  });

  it('regenerating with the recruitment template still works (regression)', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByText('Standard Offer')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Offer of Employment \(Document Template\)/)).toBeInTheDocument());

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const recOption = Array.from(select.options).find((o) => o.textContent === 'Standard Offer');
    fireEvent.change(select, { target: { value: recOption!.value } });
    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      expect.stringContaining('/email/generate'),
      expect.objectContaining({ body: expect.stringContaining(`"template_id":"${RECRUITMENT_TEMPLATE.id}"`) }),
    ));
    await waitFor(() => expect(screen.getByDisplayValue('Standard Offer Subject')).toBeInTheDocument());
  });
});
