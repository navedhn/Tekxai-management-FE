import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useGetDocumentDetail } from '@/services/hrDocumentsService';
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

export default function HrDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: doc, isLoading } = useGetDocumentDetail(id);

  if (isLoading) {
    return <div className="flex items-center justify-center py-32 text-gray-400 text-sm">Loading…</div>;
  }
  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <p className="text-sm font-semibold text-gray-500">Document not found.</p>
        <button onClick={() => navigate('/hr/documents')} className="text-sm text-primary-600 font-semibold hover:underline">Back to Documents</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/hr/documents')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-gray-900">{doc.title}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {doc.user ? `${doc.user.first_name} ${doc.user.last_name}` : '—'} · {doc.category?.name} · {doc.type?.name}
          </p>
        </div>
        <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full', STATUS_STYLE[doc.status])}>{doc.status}</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 text-gray-900 font-black mb-4">
          <FileText size={16} className="text-primary-500" />
          <span>Document Content</span>
        </div>
        <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-6 border border-gray-100">
          {doc.content}
        </div>
      </div>

      {doc.previous_document && (
        <p className="text-xs text-gray-400">
          This is a renewal of <button className="text-primary-600 font-semibold hover:underline" onClick={() => navigate(`/hr/documents/${doc.previous_document!.id}`)}>{doc.previous_document.title}</button>
        </p>
      )}
      {!!doc.renewals?.length && (
        <p className="text-xs text-gray-400">
          Renewed by: {doc.renewals.map((r) => (
            <button key={r.id} className="text-primary-600 font-semibold hover:underline mr-2" onClick={() => navigate(`/hr/documents/${r.id}`)}>{r.title}</button>
          ))}
        </p>
      )}
    </div>
  );
}
