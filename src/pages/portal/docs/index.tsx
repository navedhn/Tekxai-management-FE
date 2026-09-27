import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, MessageSquare, Download } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { useToastContext } from '@/components/toast/ToastProvider';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { PageSkeleton } from '@/components/skeletons';

type PortalDocument = {
  id: string;
  source: 'file' | 'communication';
  attachment_id?: string | null;
  title: string;
  document_type: string | null;
  size_bytes?: number | null;
  created_at: string;
  project: { id: string; title: string } | null;
  uploaded_by: { id: string; first_name: string; last_name: string } | null;
};

function formatBytes(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Every document a portal user can see, whether it was uploaded to a
// project's Files tab or attached to a Communication message — mirrors
// ClickUp's own company-wide Docs list, but for real project files rather
// than wiki pages.
const PortalDocsPage: React.FC = () => {
  const { role } = useAuth();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const toast = useToastContext();
  const [search, setSearch] = useState('');

  const { data: docs = [], isLoading } = useQuery<PortalDocument[]>({
    queryKey: ['portal', 'documents'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.DOCUMENTS),
    select: (r: any) => r?.payload?.records || [],
  });

  const q = search.trim().toLowerCase();
  const filtered = docs.filter((d) => {
    if (!q) return true;
    return [d.title, d.project?.title].some((v) => (v || '').toLowerCase().includes(q));
  });

  const openDoc = async (d: PortalDocument) => {
    if (!d.project) return;
    try {
      const url = d.source === 'file'
        ? API_ENDPOINTS.PORTAL.FILE_VIEW_URL(d.project.id, d.id)
        : API_ENDPOINTS.PORTAL.MESSAGE_ATTACHMENT_VIEW_URL(d.project.id, d.id, d.attachment_id);
      const res = await apiRequest<any>(url);
      const viewUrl = res?.payload?.view_url;
      if (viewUrl) window.open(viewUrl, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Failed to open document');
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Docs</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          {isSuperAdmin
            ? "Every file uploaded across your projects — from a project's Files tab or shared in Communication."
            : 'Every file shared with you in your projects’ Communication threads.'}
        </p>
      </div>

      <Card className="border-none shadow-sm bg-teal-50/60 flex items-center gap-3 px-5 py-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name or project…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none"
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Project</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Uploaded By</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                  {search ? 'No documents match your search.' : 'No documents uploaded yet.'}
                </td></tr>
              )}
              {filtered.map((d) => (
                <tr key={`${d.source}-${d.id}-${d.attachment_id ?? ''}`} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <button onClick={() => openDoc(d)} className="flex items-center gap-2 font-bold text-gray-900 hover:text-primary-600 hover:underline text-left">
                      <FileText size={15} className="shrink-0 text-gray-400" />
                      <span className="truncate max-w-[280px]">{d.title}</span>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{d.project?.title || '—'}</td>
                  <td className="px-5 py-3">
                    <Badge variant="info" className="text-[10px] font-bold border rounded-lg px-2 py-0.5 bg-gray-50 text-gray-500 border-gray-100 inline-flex items-center gap-1">
                      {d.source === 'communication' ? <MessageSquare size={10} /> : <Download size={10} />}
                      {d.source === 'communication' ? 'Communication' : 'Files'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {d.uploaded_by ? `${d.uploaded_by.first_name} ${d.uploaded_by.last_name}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatBytes(d.size_bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default PortalDocsPage;
