import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Send, X, Plus, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useToastContext } from '@/components/toast/ToastProvider';

interface BuReportEmailRow {
  business_unit_id: string;
  business_unit_name: string;
  business_unit_code: string | null;
  email_enabled: boolean;
  recipients: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function BusinessUnitRow({ row, onSaved }: { row: BuReportEmailRow; onSaved: () => void }) {
  const toast = useToastContext();
  const [enabled, setEnabled] = useState(row.email_enabled);
  const [recipients, setRecipients] = useState<string[]>(row.recipients);
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(row.email_enabled);

  const dirty =
    enabled !== row.email_enabled ||
    recipients.length !== row.recipients.length ||
    recipients.some((r, i) => r !== row.recipients[i]);

  const save = useMutation({
    mutationFn: () =>
      apiRequest<any>(API_ENDPOINTS.SETTINGS.BUSINESS_UNIT_REPORT_EMAIL_ITEM(row.business_unit_id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_enabled: enabled, recipients }),
      }),
    onSuccess: () => {
      toast.success(`${row.business_unit_name}: reporting email settings saved`);
      onSaved();
    },
    onError: (e: any) =>
      toast.error(e?.message || e?.response?.data?.message || 'Failed to save reporting email settings'),
  });

  const addRecipient = () => {
    const candidate = draft.trim().toLowerCase();
    if (!candidate) return;
    if (!EMAIL_RE.test(candidate)) {
      setDraftError('Enter a valid email address');
      return;
    }
    if (recipients.includes(candidate)) {
      setDraftError('This address is already in the list');
      return;
    }
    setRecipients((prev) => [...prev, candidate]);
    setDraft('');
    setDraftError(null);
  };

  const removeRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-4 bg-gray-50/50">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{row.business_unit_name}</p>
          {row.business_unit_code && (
            <p className="text-xs text-gray-400 font-mono">{row.business_unit_code}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="text-xs font-bold text-gray-500">Send Reporting Email</label>
          <select
            value={enabled ? 'true' : 'false'}
            onChange={(e) => {
              const next = e.target.value === 'true';
              setEnabled(next);
              if (next) setExpanded(true);
            }}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400 bg-white"
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
            aria-label={expanded ? 'Collapse recipients' : 'Expand recipients'}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {!enabled && (
            <p className="text-xs text-gray-400">
              Recipients below are kept but inactive while Send Reporting Email is set to No — reporting itself is unaffected, only email delivery is skipped.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {recipients.length === 0 && (
              <p className="text-xs text-gray-400 italic">No recipients configured yet.</p>
            )}
            {recipients.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium"
              >
                {email}
                <button
                  type="button"
                  onClick={() => removeRecipient(email)}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary-100"
                  aria-label={`Remove ${email}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>

          <div>
            <div className="flex gap-2">
              <input
                type="email"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setDraftError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addRecipient();
                  }
                }}
                placeholder="name@example.com"
                className="flex-1 h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-400"
              />
              <button
                type="button"
                onClick={addRecipient}
                className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            {draftError && <p className="text-xs text-red-500 mt-1">{draftError}</p>}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate()}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={13} />
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportingEmailSettings() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['business-unit-report-email-settings'],
    queryFn: () =>
      apiRequest<any>(API_ENDPOINTS.SETTINGS.BUSINESS_UNIT_REPORT_EMAIL).then(
        (r: any) => (r?.payload || []) as BuReportEmailRow[],
      ),
    staleTime: 10000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['business-unit-report-email-settings'] });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
          <Mail size={18} className="text-teal-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            Reporting Email <Send size={13} className="text-gray-300" />
          </h2>
          <p className="text-xs text-gray-400">
            Per Business Unit, decide whether the Daily Report notification email is sent and to which addresses. Reporting itself always continues — this only controls email delivery.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-gray-400">No active Business Units found.</p>
      ) : (
        <div className="space-y-3">
          {data.map((row) => (
            <BusinessUnitRow key={row.business_unit_id} row={row} onSaved={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
