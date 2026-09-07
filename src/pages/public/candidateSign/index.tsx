import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useGetPublicDocumentQuery, useSignPublicDocumentMutation } from '@/services/hrDocumentsPublicService';
import SignaturePad from '@/components/hr-documents/SignaturePad';
import { cn } from '@/utils/cn';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-center gap-2 mb-6">
        <span className="text-lg font-black text-primary-700 tracking-tight">TEKXAI HR</span>
      </div>
      {children}
    </div>
  </div>
);

const StateCard: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; tone?: 'error' | 'success' }> = ({ icon, title, subtitle, tone = 'error' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center gap-4">
    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${tone === 'success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
      {icon}
    </div>
    <div>
      <h2 className="text-xl font-black text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 font-medium mt-2 max-w-sm">{subtitle}</p>
    </div>
  </div>
);

const CandidateSignPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, isError } = useGetPublicDocumentQuery(token || '');
  const signMutation = useSignPublicDocumentMutation(token || '');
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const [typedName, setTypedName] = useState('');
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  const doc = (data as any)?.payload;

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading your document…</p>
        </div>
      </Shell>
    );
  }

  if (isError || !doc) {
    return (
      <Shell>
        <StateCard
          icon={<AlertTriangle size={28} />}
          title="Link Invalid or Expired"
          subtitle="This signing link isn't valid — it may have expired, already been used, or been superseded by a newer link. Please contact HR for a fresh link."
        />
      </Shell>
    );
  }

  const isCompleted = doc.status === 'SIGNED' || doc.already_signed;
  const justSigned = signed;

  if (justSigned || isCompleted) {
    return (
      <Shell>
        <StateCard
          tone="success"
          icon={<CheckCircle2 size={28} />}
          title={justSigned ? 'Signed Successfully' : 'Already Signed'}
          subtitle={justSigned
            ? `Thank you — your signature on "${doc.title}" has been recorded. A confirmation has been sent to your email.`
            : `"${doc.title}" has already been signed. No further action is needed.`}
        />
      </Shell>
    );
  }

  const canSign = mode === 'type' ? !!typedName.trim() : !!drawnSignature;

  const handleSign = () => {
    const signature_data = mode === 'type' ? typedName.trim() : drawnSignature;
    if (!signature_data) return;
    signMutation.mutate(
      { signature_data },
      { onSuccess: () => setSigned(true) }
    );
  };

  return (
    <Shell>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-black text-gray-900">{doc.title}</h1>
          <p className="text-xs text-gray-400 mt-1">
            Prepared for {doc.recipient?.name || 'you'}{doc.recipient?.email ? ` · ${doc.recipient.email}` : ''}
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 text-gray-900 font-black mb-4 text-sm">
            <FileText size={16} className="text-primary-500" />
            <span>Document Content</span>
          </div>
          <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-6 border border-gray-100 max-h-[50vh] overflow-y-auto">
            {doc.content}
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <div className="flex gap-1 mb-3 bg-gray-100 rounded-xl p-1 max-w-xs">
            <button
              type="button"
              onClick={() => setMode('type')}
              className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', mode === 'type' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
            >
              Type Name
            </button>
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', mode === 'draw' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}
            >
              Draw Signature
            </button>
          </div>
          {mode === 'type' ? (
            <>
              <p className="text-xs text-gray-400 mb-3">Type your full name below to apply your signature to this document.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  autoFocus
                  className="flex-1 h-11 px-3 border border-gray-200 rounded-xl text-sm font-serif italic focus:outline-none focus:border-primary-400 bg-white"
                  placeholder="Your full name"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                />
                <button
                  disabled={!canSign || signMutation.isPending}
                  onClick={handleSign}
                  className="h-11 px-6 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 whitespace-nowrap"
                >
                  {signMutation.isPending ? 'Signing…' : 'Apply Signature'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">Draw your signature below with your mouse or finger.</p>
              <SignaturePad onChange={setDrawnSignature} />
              <button
                disabled={!canSign || signMutation.isPending}
                onClick={handleSign}
                className="mt-3 h-11 px-6 w-full sm:w-auto bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 whitespace-nowrap"
              >
                {signMutation.isPending ? 'Signing…' : 'Apply Signature'}
              </button>
            </>
          )}
          {signMutation.isError && (
            <p className="text-xs text-red-500 mt-2 font-medium">
              {(signMutation.error as any)?.message || 'Something went wrong — please try again or contact HR.'}
            </p>
          )}
        </div>
      </div>
    </Shell>
  );
};

export default CandidateSignPage;
