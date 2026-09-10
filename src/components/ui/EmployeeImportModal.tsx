import React, { useMemo, useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useEmployeeImportPreview, useEmployeeImportCommit,
  type ImportPreview, type ImportRow,
} from '@/services/employeeImportService';

type Overrides = Record<string, { active?: boolean; header?: string }>;

const STEPS = ['Upload', 'Column Mapping', 'Matching', 'Field Changes', 'Confirm'] as const;

// Fields the admin can opt IN to (off by default on the backend).
const OPT_IN = new Set(['full_name', 'notes']);

export default function EmployeeImportModal({
  isOpen, onClose, onCommitted,
}: { isOpen: boolean; onClose: () => void; onCommitted?: () => void }) {
  const toast = useToastContext();
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [rowMatches, setRowMatches] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [committed, setCommitted] = useState<Awaited<ReturnType<ReturnType<typeof useEmployeeImportCommit>['mutateAsync']>> | null>(null);

  const previewMut = useEmployeeImportPreview();
  const commitMut = useEmployeeImportCommit();

  const reset = () => {
    setStep(0); setFile(null); setOverrides({}); setRowMatches({}); setPreview(null); setCommitted(null);
    previewMut.reset(); commitMut.reset();
  };
  const close = () => { reset(); onClose(); };

  const runPreview = async (goTo: number, ov: Overrides = overrides, rm: Record<string, string> = rowMatches) => {
    if (!file) return;
    try {
      const p = await previewMut.mutateAsync({ file, overrides: ov, rowMatches: rm });
      setPreview(p);
      setStep(goTo);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Could not read that file');
    }
  };

  const runCommit = async () => {
    if (!file || !preview) return;
    try {
      const res = await commitMut.mutateAsync({ runId: preview.run_id, file });
      setCommitted(res);
      setStep(4);
      onCommitted?.();
      toast.success(`Import complete — ${res.summary.updated} employee(s) updated`);
    } catch (e: any) {
      toast.error(e?.data?.message || e?.message || 'Import failed');
    }
  };

  const rows = preview?.rows ?? [];
  const willUpdate = useMemo(() => rows.filter((r) => r.status === 'will_update'), [rows]);
  const unmatched = useMemo(() => rows.filter((r) => r.status === 'unmatched'), [rows]);
  const ambiguous = useMemo(() => rows.filter((r) => r.status === 'ambiguous'), [rows]);

  return (
    <Modal isOpen={isOpen} onClose={close} title="Import Employees" size="xl" bodyClassName="!p-0">
      <div className="px-6 pt-4">
        <Stepper step={committed ? 4 : step} />
      </div>

      <div className="px-6 py-5 max-h-[62vh] overflow-y-auto">
        {/* ── Step 0 — Upload ─────────────────────────────────────────── */}
        {step === 0 && (
          <div>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center gap-3 hover:border-purple-300 hover:bg-purple-50/40 transition-colors"
            >
              <UploadCloud size={34} className="text-purple-500" />
              <span className="text-sm font-semibold text-gray-700">
                {file ? file.name : 'Choose a .csv or .xlsx file'}
              </span>
              <span className="text-xs text-gray-400">
                The detailed employee file. Employees are matched by email and only updated — never created.
              </span>
            </button>
            <input
              ref={fileInput} type="file" accept=".csv,.xlsx" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(null); } }}
            />
            {file && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <FileSpreadsheet size={15} className="text-green-600" />
                {(file.size / 1024).toFixed(0)} KB — ready
              </div>
            )}
          </div>
        )}

        {/* ── Step 1 — Column Mapping ─────────────────────────────────── */}
        {step === 1 && preview && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">
              Auto-detected mapping. Bank / IBAN and other sensitive fields are masked everywhere and
              {preview.importer_can_bank ? ' will be written because you hold salary access.' : ' will be skipped — you do not hold salary access.'}
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-400 uppercase text-xs">
                  <tr><th className="text-left px-3 py-2">ERP Field</th><th className="text-left px-3 py-2">Source Column</th><th className="text-left px-3 py-2">Active</th></tr>
                </thead>
                <tbody>
                  {Object.entries(preview.fields).map(([key, f]) => (
                    <tr key={key} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-700">
                        {f.label}{f.sensitive && <span className="ml-1.5 text-[10px] font-bold text-amber-600 uppercase">sensitive</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{f.header || <span className="text-gray-300">— not in file —</span>}</td>
                      <td className="px-3 py-2">
                        {f.reason ? (
                          <span className="text-xs text-gray-400">{f.reason}</span>
                        ) : f.mapped ? (
                          <label className="inline-flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={f.active}
                              disabled={!OPT_IN.has(key) && f.active && !('active' in (overrides[key] || {}))}
                              onChange={(e) => {
                                const next = { ...overrides, [key]: { ...(overrides[key] || {}), active: e.target.checked } };
                                setOverrides(next);
                              }}
                            />
                            {f.active ? 'on' : 'off'}
                            {OPT_IN.has(key) && <span className="text-gray-400">(off by default)</span>}
                          </label>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.unmapped_headers.length > 0 && (
              <p className="text-xs text-gray-400">
                Not mapped to any ERP field (ignored): {preview.unmapped_headers.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* ── Step 2 — Matching ──────────────────────────────────────── */}
        {step === 2 && preview && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <Stat label="Total" value={preview.summary.total_rows} />
              <Stat label="Matched" value={preview.summary.matched} tone="blue" />
              <Stat label="Will update" value={preview.summary.will_update} tone="green" />
              <Stat label="No change" value={preview.summary.no_change} />
              <Stat label="Unmatched" value={preview.summary.unmatched} tone="amber" />
              <Stat label="Ambiguous" value={preview.summary.ambiguous} tone="red" />
            </div>
            <RowTable
              rows={rows}
              mode="match"
              rowMatches={rowMatches}
              onRowMatchChange={(key, val) => setRowMatches((m) => {
                const next = { ...m };
                if (val.trim()) next[key] = val.trim(); else delete next[key];
                return next;
              })}
              onRecheck={() => runPreview(2)}
              rechecking={previewMut.isPending}
            />
          </div>
        )}

        {/* ── Step 3 — Field Changes ─────────────────────────────────── */}
        {step === 3 && preview && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500">{willUpdate.length} employee(s) will change. Sensitive values are masked.</p>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="text-left px-3 py-2">Employee</th>
                    <th className="text-left px-3 py-2">Field</th>
                    <th className="text-left px-3 py-2">Current</th>
                    <th className="text-left px-3 py-2">Imported</th>
                  </tr>
                </thead>
                <tbody>
                  {willUpdate.flatMap((r) =>
                    (r.changes ?? []).map((c, i) => (
                      <tr key={`${r.row}-${c.key}`} className="border-t border-gray-100">
                        {i === 0 && (
                          <td className="px-3 py-2 align-top font-medium text-gray-700" rowSpan={r.changes!.length}>
                            {r.match?.erp_name}
                            <div className="text-xs text-gray-400">{r.match?.erp_employee_id || r.email}</div>
                          </td>
                        )}
                        <td className="px-3 py-2 text-gray-600">{c.field}{c.append && <span className="ml-1 text-[10px] text-blue-500 uppercase font-bold">append</span>}</td>
                        <td className="px-3 py-2 text-gray-400">{c.current ?? <span className="text-gray-300">—</span>}</td>
                        <td className="px-3 py-2 text-gray-800 font-medium">{c.imported}</td>
                      </tr>
                    )),
                  )}
                  {willUpdate.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Nothing to update.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {(unmatched.length > 0 || ambiguous.length > 0) && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                {unmatched.length} unmatched and {ambiguous.length} ambiguous row(s) will be skipped — no records created or guessed.
              </div>
            )}
          </div>
        )}

        {/* ── Step 4 — Confirm / Result ──────────────────────────────── */}
        {step === 4 && !committed && preview && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-sm text-gray-700 font-semibold mb-2">About to apply</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {willUpdate.length} employee(s) updated</li>
                <li>• {preview.summary.no_change} unchanged</li>
                <li>• {unmatched.length} unmatched + {ambiguous.length} ambiguous skipped</li>
              </ul>
            </div>
            <p className="text-xs text-gray-400">
              The file is re-sent now and re-checked against live data before any write. Raw sensitive values are never stored.
            </p>
          </div>
        )}

        {step === 4 && committed && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-green-600 font-semibold"><CheckCircle2 size={18} /> Import committed</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <Stat label="Total" value={committed.summary.total_rows} />
              <Stat label="Updated" value={committed.summary.updated} tone="green" />
              <Stat label="No change" value={committed.summary.no_change} />
              <Stat label="Unmatched" value={committed.summary.unmatched} tone="amber" />
              <Stat label="Ambiguous" value={committed.summary.ambiguous} tone="red" />
              <Stat label="Failed" value={committed.summary.failed} tone={committed.summary.failed ? 'red' : undefined} />
            </div>
            <RowTable rows={committed.rows as ImportRow[]} mode="result" />
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
        <Button
          variant="ghost" size="sm" animation="none" leftIcon={ArrowLeft}
          disabled={step === 0 || step === 4 && !!committed || previewMut.isPending || commitMut.isPending}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>

        {step === 4 && committed ? (
          <Button variant="primary" size="sm" animation="none" onClick={close}>Done</Button>
        ) : step === 4 ? (
          <Button variant="primary" size="sm" animation="none" leftIcon={commitMut.isPending ? Loader2 : CheckCircle2} disabled={commitMut.isPending} onClick={runCommit}>
            {commitMut.isPending ? 'Applying…' : 'Confirm import'}
          </Button>
        ) : step === 0 ? (
          <Button variant="primary" size="sm" animation="none" rightIcon={previewMut.isPending ? Loader2 : ArrowRight} disabled={!file || previewMut.isPending} onClick={() => runPreview(1)}>
            {previewMut.isPending ? 'Reading…' : 'Continue'}
          </Button>
        ) : step === 1 ? (
          <Button variant="primary" size="sm" animation="none" rightIcon={previewMut.isPending ? Loader2 : ArrowRight} disabled={previewMut.isPending} onClick={() => runPreview(2)}>
            {previewMut.isPending ? 'Re-checking…' : 'Apply mapping'}
          </Button>
        ) : (
          <Button variant="primary" size="sm" animation="none" rightIcon={ArrowRight} onClick={() => setStep((s) => s + 1)}>
            {step === 3 ? 'Review & confirm' : 'Next'}
          </Button>
        )}
      </div>
    </Modal>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${i <= step ? 'text-purple-600' : 'text-gray-300'}`}>
            <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] ${i < step ? 'bg-purple-600 text-white' : i === step ? 'border-2 border-purple-600' : 'border-2 border-gray-200'}`}>
              {i < step ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? 'bg-purple-300' : 'bg-gray-100'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
  const map = {
    blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700',
  } as const;
  return (
    <div className={`rounded-xl p-2.5 text-center ${tone ? map[tone] : 'bg-gray-50 text-gray-600'}`}>
      <div className="text-lg font-black leading-none">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide mt-1 opacity-70">{label}</div>
    </div>
  );
}

function RowTable({
  rows, mode, rowMatches, onRowMatchChange, onRecheck, rechecking,
}: {
  rows: ImportRow[];
  mode: 'match' | 'result';
  rowMatches?: Record<string, string>;
  onRowMatchChange?: (key: string, value: string) => void;
  onRecheck?: () => void;
  rechecking?: boolean;
}) {
  const icon = (s: string) =>
    s === 'unmatched' ? <AlertTriangle size={14} className="text-amber-500" />
    : s === 'ambiguous' ? <XCircle size={14} className="text-red-500" />
    : s === 'failed' ? <XCircle size={14} className="text-red-500" />
    : <CheckCircle2 size={14} className="text-green-500" />;
  const keyOf = (r: ImportRow) => (r.email ? r.email.toLowerCase() : `row:${r.row}`);
  const canManual = mode === 'match' && !!onRowMatchChange;
  const anyManual = canManual && rows.some((r) => r.status === 'unmatched' || r.status === 'ambiguous');
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border border-gray-100 max-h-[36vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-400 uppercase text-xs sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 w-10">#</th>
              <th className="text-left px-3 py-2">Source</th>
              <th className="text-left px-3 py-2">ERP match</th>
              <th className="text-left px-3 py-2">{mode === 'result' ? 'Outcome' : 'Status'}</th>
              {canManual && <th className="text-left px-3 py-2">Manual match</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.row} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-400">{r.row}</td>
                <td className="px-3 py-2 text-gray-600">{r.display_name || r.email || '—'}</td>
                <td className="px-3 py-2 text-gray-700">
                  {r.match ? <>{r.match.erp_name}<span className="text-gray-400"> · {r.match.method}</span></> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    {icon((r as any).status)}
                    {(r as any).status.replace('_', ' ')}
                    {r.reason && <span className="text-gray-400">— {r.reason}</span>}
                  </span>
                </td>
                {canManual && (
                  <td className="px-3 py-2">
                    {(r.status === 'unmatched' || r.status === 'ambiguous') ? (
                      <input
                        type="text"
                        placeholder="Employee ID or email"
                        defaultValue={rowMatches?.[keyOf(r)] || ''}
                        onBlur={(e) => onRowMatchChange!(keyOf(r), e.target.value)}
                        className="w-44 rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-purple-400 focus:outline-none"
                      />
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {anyManual && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Enter an ERP Employee ID or email for any unmatched row, then re-check. Blank rows stay skipped.
          </p>
          <Button variant="outline" size="sm" animation="none" leftIcon={rechecking ? Loader2 : ArrowRight} disabled={rechecking} onClick={onRecheck}>
            {rechecking ? 'Re-checking…' : 'Re-check matches'}
          </Button>
        </div>
      )}
    </div>
  );
}
