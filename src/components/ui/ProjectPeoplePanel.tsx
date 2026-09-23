import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X, Search, Mail, Building2, ShieldCheck } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useToastContext } from '@/components/toast/ToastProvider';
import { cn } from '@/utils/cn';
import Loader from './Loader';

// A single merged roster — internal project_members + client
// client_project_access users — for one project, with the ability to add
// an existing employee/client directly or invite a brand-new client
// contact, all scoped to this project (GET/POST/DELETE
// /project/:id/access...). Deliberately does NOT support inviting a new
// INTERNAL employee — that's the separate HR onboarding flow (Add
// Employee page), out of scope for a project people picker.
//
// Authorization is enforced entirely server-side: viewing needs project
// access (membership or ownership/leadership), adding/removing needs
// admin_or_project_owner (this project's own owner/leader, or an
// ALL-scope elevated permission). `canManage` here only controls whether
// the add/remove affordances render — never a substitute for the real
// check.

type Person = { id: string; type: 'INTERNAL' | 'CLIENT'; first_name: string; last_name: string; email: string; role: string };

function displayName(p: { first_name?: string; last_name?: string; email?: string }) {
  return `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || 'Unknown';
}

function isEmailLike(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

interface ProjectPeoplePanelProps {
  projectId: string;
  canManage: boolean;
}

const ProjectPeoplePanel: React.FC<ProjectPeoplePanelProps> = ({ projectId, canManage }) => {
  const qc = useQueryClient();
  const toast = useToastContext();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data, isLoading } = useQuery<{ internal: Person[]; clients: Person[] }>({
    queryKey: ['project-access', 'list', projectId],
    queryFn: () => apiRequest<any>(API_ENDPOINTS.PROJECT_ACCESS.LIST(projectId)),
    select: (r: any) => r?.payload || { internal: [], clients: [] },
  });

  const removePerson = useMutation({
    mutationFn: (p: Person) =>
      apiRequest<any>(`${API_ENDPOINTS.PROJECT_ACCESS.REMOVE(projectId, p.id)}?type=${p.type}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-access', 'list', projectId] }),
    onError: () => toast?.error?.('Failed to remove access'),
  });

  const internal = data?.internal || [];
  const clients = data?.clients || [];
  const isEmpty = !isLoading && internal.length === 0 && clients.length === 0;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-gray-900 tracking-tight">People with Access</h3>
        {canManage && (
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700"
          >
            <UserPlus size={14} /> Add Person
          </button>
        )}
      </div>

      {isLoading && <div className="flex justify-center py-6"><Loader size={28} /></div>}

      {isEmpty && (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 font-semibold text-sm">
          No one has explicit access yet.
        </div>
      )}

      {!isEmpty && (
        <div className="flex flex-col gap-2">
          {internal.map((p) => (
            <PersonRow key={`internal-${p.id}`} person={p} canManage={canManage} onRemove={() => removePerson.mutate(p)} />
          ))}
          {clients.map((p) => (
            <PersonRow key={`client-${p.id}`} person={p} canManage={canManage} onRemove={() => removePerson.mutate(p)} />
          ))}
        </div>
      )}

      {pickerOpen && (
        <AddPersonModal projectId={projectId} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
};

const PersonRow: React.FC<{ person: Person; canManage: boolean; onRemove: () => void }> = ({ person, canManage, onRemove }) => {
  const isClient = person.type === 'CLIENT';
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3">
      <div className={cn('h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-black text-white', isClient ? 'bg-emerald-500' : 'bg-primary-500')}>
        {displayName(person).slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-900 truncate">{displayName(person)}</span>
          <span className={cn('text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded', isClient ? 'bg-emerald-50 text-emerald-600' : 'bg-primary-50 text-primary-600')}>
            {isClient ? 'Client' : 'TekXAI'}
          </span>
          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{person.role}</span>
        </div>
        <p className="text-xs text-gray-400 truncate">{person.email}</p>
      </div>
      {canManage && (
        <button
          onClick={onRemove}
          className="flex items-center justify-center h-7 w-7 rounded-full text-gray-300 hover:bg-red-50 hover:text-red-500 shrink-0"
          title="Remove access"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

const AddPersonModal: React.FC<{ projectId: string; onClose: () => void }> = ({ projectId, onClose }) => {
  const qc = useQueryClient();
  const toast = useToastContext();
  const [search, setSearch] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isFetching } = useQuery<{ internal: Person[]; clients: Person[] }>({
    queryKey: ['project-access', 'addable', projectId, debouncedSearch],
    queryFn: () => apiRequest<any>(`${API_ENDPOINTS.PROJECT_ACCESS.ADDABLE(projectId)}?search=${encodeURIComponent(debouncedSearch)}`),
    select: (r: any) => r?.payload || { internal: [], clients: [] },
    enabled: debouncedSearch.trim().length >= 2,
  });

  const addPerson = useMutation({
    mutationFn: (p: { user_id: string; type: 'INTERNAL' | 'CLIENT' }) =>
      apiRequest<any>(API_ENDPOINTS.PROJECT_ACCESS.ADD(projectId), { method: 'POST', body: JSON.stringify(p) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-access', 'list', projectId] });
      toast?.success?.('Added to project');
      onClose();
    },
    onError: () => toast?.error?.('Failed to add — they may already have access'),
  });

  const inviteClient = useMutation({
    mutationFn: () =>
      apiRequest<any>(API_ENDPOINTS.PROJECT_ACCESS.INVITE_CLIENT(projectId), {
        method: 'POST',
        body: JSON.stringify({ email: search.trim(), first_name: inviteFirstName || undefined, last_name: inviteLastName || undefined }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-access', 'list', projectId] });
      toast?.success?.('Invite sent');
      onClose();
    },
    onError: (e: any) => toast?.error?.(e?.message || 'Failed to send invite — this project may have no client assigned yet'),
  });

  const results = data || { internal: [], clients: [] };
  const hasResults = results.internal.length > 0 || results.clients.length > 0;
  const showInviteNew = isEmailLike(search) && !isFetching && !hasResults && debouncedSearch.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-black text-gray-900">Add Person</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3 h-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {isFetching && <div className="flex justify-center py-4"><Loader size={20} /></div>}

            {!isFetching && debouncedSearch.trim().length < 2 && (
              <p className="text-xs text-gray-400 text-center py-4">Type at least 2 characters to search.</p>
            )}

            {!isFetching && results.internal.map((u) => (
              <button
                key={u.id}
                onClick={() => addPerson.mutate({ user_id: u.id, type: 'INTERNAL' })}
                disabled={addPerson.isPending}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-gray-50 disabled:opacity-50"
              >
                <ShieldCheck size={14} className="text-primary-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{displayName(u)}</p>
                  <p className="text-[11px] text-gray-400 truncate">{u.email} · Employee</p>
                </div>
              </button>
            ))}

            {!isFetching && results.clients.map((u) => (
              <button
                key={u.id}
                onClick={() => addPerson.mutate({ user_id: u.id, type: 'CLIENT' })}
                disabled={addPerson.isPending}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-gray-50 disabled:opacity-50"
              >
                <Building2 size={14} className="text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{displayName(u)}</p>
                  <p className="text-[11px] text-gray-400 truncate">{u.email} · Client portal user</p>
                </div>
              </button>
            ))}

            {showInviteNew && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-primary-50/60 border border-primary-100 mt-1">
                <div className="flex items-center gap-2 text-xs font-bold text-primary-700">
                  <Mail size={14} /> No match — invite as a new client contact
                </div>
                <div className="flex gap-2">
                  <input
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    placeholder="First name"
                    className="flex-1 h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                  <input
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    placeholder="Last name"
                    className="flex-1 h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                </div>
                <button
                  onClick={() => inviteClient.mutate()}
                  disabled={inviteClient.isPending}
                  className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-primary-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  Invite {search.trim()}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default ProjectPeoplePanel;
