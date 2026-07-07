import React, { useRef, useState } from 'react';
import { FileText, Plus, Trash2, Download } from 'lucide-react';
import Select from './Select';
import Input from './Input';
import Button from './Button';
import Loader from './Loader';
import { useToastContext } from '@/components/toast/ToastProvider';
import { BASE_URL } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { getAccessToken } from '@/utils/tokenMemory';
import {
  useProjectDocuments, useDocumentTypes, useCreateProjectDocument, useDeleteProjectDocument,
} from '@/services/projectDocumentsService';

interface ProjectDocumentsPanelProps {
  projectId: string;
  canEdit: boolean;
}

const ProjectDocumentsPanel: React.FC<ProjectDocumentsPanelProps> = ({ projectId, canEdit }) => {
  const toast = useToastContext();
  const { data: docs = [], isLoading } = useProjectDocuments(projectId);
  const { data: docTypes = [] } = useDocumentTypes(projectId);
  const createDoc = useCreateProjectDocument(projectId);
  const deleteDoc = useDeleteProjectDocument(projectId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ document_type: 'OTHER', title: '', file_url: '' });

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${BASE_URL}${API_ENDPOINTS.STORAGE.UPLOAD}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken() || ''}` },
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        setForm((f) => ({ ...f, file_url: json.payload.file_url, title: f.title || file.name.replace(/\.[^.]+$/, '') }));
        setShowForm(true);
      } else {
        toast.error(json.message || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.file_url.trim()) return toast.error('Please upload a file first');
    createDoc.mutate(form, {
      onSuccess: () => { toast.success('Document added'); setForm({ document_type: 'OTHER', title: '', file_url: '' }); setShowForm(false); },
      onError: (e: any) => toast.error(e?.message || 'Failed to add document'),
    });
  };

  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="w-full flex items-center justify-between gap-3 p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <FileText size={18} strokeWidth={2.5} className="text-primary-500" />
          <h3 className="font-black text-gray-900 tracking-tight text-[15px]">Project Documents</h3>
        </div>
        {canEdit && (
          <>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick} />
            <Button
              leftIcon={Plus}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-[#005CDA11] hover:bg-[#005CDA22] border-none font-black text-[11px] h-9 rounded-xl py-0 px-4"
            >
              {uploading ? 'Uploading…' : 'Upload Document'}
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 p-6">
        {showForm && (
          <div className="flex flex-col gap-3 p-4 bg-gray-50/60 rounded-2xl">
            <Select
              label="Document Type"
              options={docTypes.length ? docTypes : [{ label: 'Other', value: 'OTHER' }]}
              value={form.document_type}
              onChange={(v) => setForm((f) => ({ ...f, document_type: String(v) }))}
            />
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Statement of Work"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)} className="h-9 rounded-xl font-bold text-xs px-4">Cancel</Button>
              <Button onClick={handleSubmit} disabled={createDoc.isPending} className="bg-primary-500 text-white h-9 rounded-xl font-bold text-xs px-4">
                {createDoc.isPending ? 'Saving…' : 'Save Document'}
              </Button>
            </div>
          </div>
        )}

        {isLoading && <div className="flex justify-center py-6"><Loader size={28} /></div>}

        {!isLoading && docs.length === 0 && (
          <span className="text-xs text-gray-400 italic">No documents uploaded yet.</span>
        )}

        {docs.length > 0 && (
          <div className="flex flex-col gap-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-50/60 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={15} className="text-gray-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-gray-800 truncate">{doc.title}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase">{doc.document_type.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all">
                      <Download size={14} />
                    </a>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => deleteDoc.mutate(doc.id, { onError: (e: any) => toast.error(e?.message || 'Failed to delete') })}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDocumentsPanel;
