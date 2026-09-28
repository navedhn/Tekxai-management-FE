import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PageSkeleton } from '@/components/skeletons';

type WikiDoc = {
  id: string;
  title: string;
  parent_id: string | null;
  content?: string;
  children?: WikiDoc[];
};

const PortalWikiPage: React.FC = () => {
  const toast = useToastContext();
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const projectsQ = useQuery({
    queryKey: ['portal', 'projects'],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.PROJECTS),
  });
  const projects = projectsQ.data?.payload?.records || projectsQ.data?.payload || [];

  const activeProject = projectId || projects[0]?.id || '';

  const treeQ = useQuery({
    queryKey: ['portal', 'wiki', activeProject],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.WIKI(activeProject)),
    enabled: !!activeProject,
  });
  const tree: WikiDoc[] = treeQ.data?.payload?.tree || [];

  const docQ = useQuery({
    queryKey: ['portal', 'wiki', activeProject, selectedId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PORTAL.WIKI_DOC(activeProject, selectedId!)),
    enabled: !!activeProject && !!selectedId,
  });

  const selected = docQ.data?.payload;

  const save = useMutation({
    mutationFn: async () => {
      if (selectedId) {
        return apiRequest(API_ENDPOINTS.PORTAL.WIKI_DOC(activeProject, selectedId), {
          method: 'PUT',
          body: JSON.stringify({ title: selected?.title || title, content }),
        });
      }
      return apiRequest(API_ENDPOINTS.PORTAL.WIKI(activeProject), {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
    },
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['portal', 'wiki', activeProject] });
      setTitle('');
      setContent('');
      setSelectedId(null);
    },
    onError: (e: any) => toast.error(e?.message || 'Save failed'),
  });

  const flatLinks = useMemo(() => {
    const out: WikiDoc[] = [];
    const walk = (nodes: WikiDoc[], depth = 0) => {
      for (const n of nodes) {
        out.push({ ...n, title: `${'— '.repeat(depth)}${n.title}` });
        if (n.children?.length) walk(n.children, depth + 1);
      }
    };
    walk(tree);
    return out;
  }, [tree]);

  if (projectsQ.isLoading) return <PageSkeleton />;

  return (
    <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
      <aside className="border border-(--color-border) rounded-xl p-3 bg-(--color-surface)">
        <label className="text-xs text-(--color-text-secondary)">Project</label>
        <select
          className="w-full mt-1 mb-3 border border-(--color-border) rounded-lg px-2 py-1.5 text-sm"
          value={activeProject}
          onChange={(e) => { setProjectId(e.target.value); setSelectedId(null); }}
        >
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <button
          className="w-full mb-3 inline-flex items-center justify-center gap-1 text-sm px-2 py-1.5 rounded-lg bg-(--color-primary) text-white"
          onClick={() => { setSelectedId(null); setTitle('New page'); setContent(''); }}
        >
          <Plus size={14} /> New page
        </button>
        <div className="flex flex-col gap-0.5 max-h-[60vh] overflow-auto">
          {flatLinks.map((d) => (
            <button
              key={d.id}
              className={`text-left text-sm px-2 py-1.5 rounded-md ${selectedId === d.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
              onClick={() => { setSelectedId(d.id); setContent(''); }}
            >
              <FileText size={12} className="inline mr-1" />
              {d.title}
            </button>
          ))}
          {!flatLinks.length && <div className="text-xs text-(--color-text-secondary) px-2 py-4">No wiki pages yet.</div>}
        </div>
      </aside>

      <section className="border border-(--color-border) rounded-xl p-4 bg-(--color-surface)">
        {selectedId && selected ? (
          <>
            <input
              className="w-full text-xl font-semibold bg-transparent border-b border-(--color-border) pb-2 mb-3 outline-none"
              value={content !== '' || !selected ? (title || selected.title) : selected.title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => { if (!title) setTitle(selected.title); if (content === '') setContent(selected.content || ''); }}
            />
            <textarea
              className="w-full min-h-[360px] text-sm font-mono border border-(--color-border) rounded-lg p-3"
              value={content !== '' ? content : (selected.content || '')}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Markdown content…"
            />
            <button className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm" onClick={() => save.mutate()}>
              Save
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-2">Create wiki page</h2>
            <input
              className="w-full border border-(--color-border) rounded-lg px-3 py-2 mb-3 text-sm"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full min-h-[280px] text-sm font-mono border border-(--color-border) rounded-lg p-3"
              placeholder="Markdown content…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <button className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm" onClick={() => save.mutate()} disabled={!title.trim()}>
              Create
            </button>
          </>
        )}
      </section>
    </div>
  );
};

export default PortalWikiPage;
