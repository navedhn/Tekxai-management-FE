import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Send, Ban, Archive, X, RotateCw, PenLine, Check } from 'lucide-react';
import {
  useGetDocumentDetail, useGetDocumentPdf, useSendDocument, useViewDocument,
  useRejectDocument, useCancelDocument, useArchiveDocument, useSignDocument,
  useRenewDocument, useApproveDraftDocument, download_document_docx,
} from '@/services/hrDocumentsService';
import { useAuthStore } from '@/stores/authStore';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  GENERATED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-amber-100 text-amber-700',
  VIEWED: 'bg-purple-100 text-purple-700',
  SIGNED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
  EXPIRED: 'bg-orange-100 text-orange-700',
  ARCHIVED: 'bg-gray-100 text-gray-400',
};

const HR_ROLES = ['ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER'];

function SignModal({ role, onClose, onSign, isPending, cnicError }: { role: 'EMPLOYEE' | 'HR'; onClose: () => void; onSign: (typedName: string, cnic: string) => void; isPending: boolean; cnicError?: string | null }) {
  const [typedName, setTypedName] = useState('');
  const [cnic, setCnic] = useState('');
  const needsCnic = role === 'EMPLOYEE';
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900">Sign as {role === 'EMPLOYEE' ? 'Employee' : 'HR'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-xs text-gray-400 mb-3">Type your full name to apply your signature to this document.</p>
        <input
          autoFocus
          className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-serif italic focus:outline-none focus:border-primary-400"
          placeholder="Your full name"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
        />
        {needsCnic && (
          <div className="mt-3">
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">CNIC / National ID</label>
            <input
              className={cn(
                'w-full h-11 px-3 border rounded-xl text-sm focus:outline-none focus:border-primary-400',
                cnicError ? 'border-red-300' : 'border-gray-200'
              )}
              placeholder="12345-1234567-1"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
            />
            <p className={cn('text-xs mt-1', cnicError ? 'text-red-500' : 'text-gray-400')}>
              {cnicError || 'Only required the first time you sign — leave blank if already on file.'}
            </p>
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            disabled={!typedName.trim() || isPending}
            onClick={() => onSign(typedName.trim(), cnic.trim())}
            className="flex-1 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40"
          >
            {isPending ? 'Signing…' : 'Apply Signature'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HrDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastContext();
  const { user, role } = useAuthStore();
  const isHr = !!role && HR_ROLES.includes(role);
  const backPath = location.pathname.startsWith('/employee') ? '/employee/documents' : '/admin/documents';

  const { data: doc, isLoading } = useGetDocumentDetail(id);
  const pdfMutation = useGetDocumentPdf();
  const sendMutation = useSendDocument();
  const approveDraftMutation = useApproveDraftDocument();
  const viewMutation = useViewDocument();
  const rejectMutation = useRejectDocument();
  const cancelMutation = useCancelDocument();
  const archiveMutation = useArchiveDocument();
  const signMutation = useSignDocument();
  const renewMutation = useRenewDocument();
  const [signAs, setSignAs] = useState<'EMPLOYEE' | 'HR' | null>(null);
  const [cnicError, setCnicError] = useState<string | null>(null);
  const [docxDownloading, setDocxDownloading] = useState(false);

  // Employee portal: opening a SENT document marks it VIEWED — mirrors the
  // "read receipt" every doc-signing product has, done once per load.
  useEffect(() => {
    if (doc && doc.status === 'SENT' && doc.user_id === user?.id) {
      viewMutation.mutate({ id: doc.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, doc?.status]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-32 text-gray-400 text-sm">Loading…</div>;
  }
  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <p className="text-sm font-semibold text-gray-500">Document not found.</p>
        <button onClick={() => navigate(backPath)} className="text-sm text-primary-600 font-semibold hover:underline">Back to Documents</button>
      </div>
    );
  }

  const isOwner = doc.user_id === user?.id;
  const canAct = isHr || isOwner;
  const employeeSigned = doc.signatures?.some((s) => s.signer_role === 'EMPLOYEE' && s.signed_at);
  const hrSigned = doc.signatures?.some((s) => s.signer_role === 'HR' && s.signed_at);

  const handleDownload = () => {
    pdfMutation.mutate(doc.id, {
      onSuccess: (res) => window.open(res.url, '_blank', 'noopener'),
      onError: (e: any) => toast.error(e?.message || 'Failed to generate PDF'),
    });
  };

  const handleDownloadDocx = () => {
    setDocxDownloading(true);
    download_document_docx(doc.id, `${doc.title || 'document'}.docx`)
      .catch(() => toast.error('Failed to download DOCX'))
      .finally(() => setDocxDownloading(false));
  };

  const runAction = (mutation: any, label: string, extra?: Record<string, any>) => {
    mutation.mutate({ id: doc.id, ...extra }, {
      onSuccess: () => toast.success(label),
      onError: (e: any) => toast.error(e?.message || `Failed to ${label.toLowerCase()}`),
    });
  };

  const handleSign = (typedName: string, cnic: string) => {
    if (!signAs) return;
    setCnicError(null);
    signMutation.mutate(
      { id: doc.id, signer_role: signAs, signature_data: typedName, ...(cnic ? { cnic } : {}) },
      {
        onSuccess: () => { toast.success('Signature applied'); setSignAs(null); },
        onError: (e: any) => {
          if (e?.data?.code === 'CNIC_REQUIRED') {
            setCnicError(e?.message || 'CNIC confirmation is required before signing');
            return;
          }
          toast.error(e?.message || 'Failed to sign');
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(backPath)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-gray-900">{doc.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {doc.user ? [doc.user.first_name, doc.user.last_name].filter(Boolean).join(' ') : '—'} · {doc.category?.name} · {doc.type?.name}
          </p>
        </div>
        <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full', STATUS_STYLE[doc.status])}>{doc.status}</span>
      </div>

      {canAct && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleDownload} disabled={pdfMutation.isPending} className="flex items-center gap-2 px-3.5 h-9 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            <Download size={14} />{pdfMutation.isPending ? 'Preparing…' : 'Download PDF'}
          </button>
          <button onClick={handleDownloadDocx} disabled={docxDownloading} className="flex items-center gap-2 px-3.5 h-9 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            <Download size={14} />{docxDownloading ? 'Preparing…' : 'Download DOCX'}
          </button>

          {isHr && doc.status === 'DRAFT' && (
            <>
              <button onClick={() => runAction(approveDraftMutation, 'Approved')} className="flex items-center gap-2 px-3.5 h-9 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700">
                <Check size={14} />Approve
              </button>
              <button onClick={() => runAction(cancelMutation, 'Rejected')} className="flex items-center gap-2 px-3.5 h-9 border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-50">
                <Ban size={14} />Reject
              </button>
            </>
          )}

          {isHr && doc.status === 'GENERATED' && (
            <button onClick={() => runAction(sendMutation, 'Sent')} className="flex items-center gap-2 px-3.5 h-9 bg-primary-600 text-white rounded-xl text-xs font-semibold hover:bg-primary-700">
              <Send size={14} />Send to Employee
            </button>
          )}

          {['SENT', 'VIEWED'].includes(doc.status) && isOwner && !employeeSigned && (
            <button onClick={() => setSignAs('EMPLOYEE')} className="flex items-center gap-2 px-3.5 h-9 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700">
              <PenLine size={14} />Sign Document
            </button>
          )}
          {['SENT', 'VIEWED'].includes(doc.status) && isHr && !hrSigned && (
            <button onClick={() => setSignAs('HR')} className="flex items-center gap-2 px-3.5 h-9 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700">
              <PenLine size={14} />Countersign as HR
            </button>
          )}

          {isHr && ['SENT', 'VIEWED'].includes(doc.status) && (
            <button onClick={() => runAction(rejectMutation, 'Rejected')} className="flex items-center gap-2 px-3.5 h-9 border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-50">
              <Ban size={14} />Reject
            </button>
          )}
          {isHr && ['DRAFT', 'GENERATED', 'SENT', 'VIEWED'].includes(doc.status) && (
            <button onClick={() => runAction(cancelMutation, 'Cancelled')} className="flex items-center gap-2 px-3.5 h-9 border border-gray-200 text-gray-500 rounded-xl text-xs font-semibold hover:bg-gray-50">
              <X size={14} />Cancel
            </button>
          )}
          {isHr && ['SIGNED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(doc.status) && (
            <button onClick={() => runAction(archiveMutation, 'Archived')} className="flex items-center gap-2 px-3.5 h-9 border border-gray-200 text-gray-500 rounded-xl text-xs font-semibold hover:bg-gray-50">
              <Archive size={14} />Archive
            </button>
          )}
          {isHr && ['EXPIRED', 'REJECTED', 'SIGNED'].includes(doc.status) && (
            <button
              onClick={() => runAction(renewMutation, 'Renewed', {})}
              className="flex items-center gap-2 px-3.5 h-9 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              <RotateCw size={14} />Renew
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 text-gray-900 font-black mb-4">
          <FileText size={16} className="text-primary-500" />
          <span>Document Content</span>
        </div>
        <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-6 border border-gray-100">
          {doc.content}
        </div>
      </div>

      {!!doc.signatures?.length && doc.signatures.some((s) => s.signed_at) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Signatures</p>
          <div className="space-y-2">
            {doc.signatures.filter((s) => s.signed_at).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">{s.signer_role}</span>
                <span className="text-gray-400 text-xs">{new Date(s.signed_at!).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {doc.rejection_reason && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl p-3">Rejection reason: {doc.rejection_reason}</p>
      )}

      {doc.previous_document && (
        <p className="text-xs text-gray-400">
          This is a renewal of <button className="text-primary-600 font-semibold hover:underline" onClick={() => navigate(`${backPath}/${doc.previous_document!.id}`)}>{doc.previous_document.title}</button>
        </p>
      )}
      {!!doc.renewals?.length && (
        <p className="text-xs text-gray-400">
          Renewed by: {doc.renewals.map((r) => (
            <button key={r.id} className="text-primary-600 font-semibold hover:underline mr-2" onClick={() => navigate(`${backPath}/${r.id}`)}>{r.title}</button>
          ))}
        </p>
      )}

      {signAs && (
        <SignModal role={signAs} onClose={() => { setSignAs(null); setCnicError(null); }} onSign={handleSign} isPending={signMutation.isPending} cnicError={cnicError} />
      )}
    </div>
  );
}
