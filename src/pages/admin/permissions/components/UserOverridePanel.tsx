import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, XCircle, X, Search } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useToastContext } from '@/components/toast/ToastProvider';
import {
  useUserPermissions, useSetUserPermission, useDeleteUserPermission, useClearUserPermissions, PermissionDef,
} from '@/services/permissionsService';
import { ROLE_LABELS } from './RoleSelector';
import WorkspaceSelector from './WorkspaceSelector';
import PermissionSearch from './PermissionSearch';
import PermissionSummary from './PermissionSummary';
import { cn } from '@/utils/cn';

const SOURCE_META: Record<string, { label: string; color: string }> = {
  role_direct: { label: 'Inherited from role', color: 'bg-blue-50 text-blue-600' },
  role_inherited: { label: 'Inherited from parent role', color: 'bg-indigo-50 text-indigo-600' },
  override_grant: { label: 'Added', color: 'bg-green-50 text-green-600' },
  override_deny: { label: 'Removed', color: 'bg-red-50 text-red-600' },
  default_deny: { label: 'Not granted', color: 'bg-gray-50 text-gray-400' },
};

// Redesigned User Overrides tab — the old version already computed the
// right underlying data (source: role vs override), it just never labeled
// "Inherited / Added / Removed / Effective" clearly or grouped by workspace
// with search+filter. This keeps the exact same direct-save-per-toggle data
// flow (no local staging here, unlike the Role tab — every click is
// immediately persisted, matching the pre-existing behavior admins are
// already used to) and only changes presentation + adds the workspace/
// search/filter affordances the redesign asked for.
const UserOverridePanel: React.FC = () => {
  const toast = useToastContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [workspace, setWorkspace] = useState('erp');
  const [permSearch, setPermSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: userPerms, isLoading: loadingPerms } = useUserPermissions(selectedUser?.id);
  const setPermMutation = useSetUserPermission();
  const deletePermMutation = useDeleteUserPermission();
  const clearMutation = useClearUserPermissions();

  const doSearch = async (term: string) => {
    if (!term || term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?search=${encodeURIComponent(term)}&limit=20`);
      setSearchResults(res?.payload?.records || []);
    } finally {
      setSearching(false);
    }
  };

  const onSearchChange = (term: string) => {
    setSearchTerm(term);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(term), 350);
  };

  const handleOverride = async (permission: string, granted: boolean) => {
    if (!selectedUser) return;
    try {
      await setPermMutation.mutateAsync({ userId: selectedUser.id, permission, granted });
      toast.success(`Override saved: ${granted ? 'granted' : 'denied'}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save override');
    }
  };

  const handleRemoveOverride = async (permission: string) => {
    if (!selectedUser) return;
    try {
      await deletePermMutation.mutateAsync({ userId: selectedUser.id, permission });
      toast.success('Override removed — back to inherited default');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove override');
    }
  };

  const handleClearAll = async () => {
    if (!selectedUser) return;
    try {
      await clearMutation.mutateAsync(selectedUser.id);
      toast.success('All overrides cleared');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to clear overrides');
    }
  };

  const filtered: PermissionDef[] = useMemo(() => {
    const effective = userPerms?.effective || [];
    return effective.filter((p) => {
      if (p.workspace !== workspace && !(workspace === 'erp' && p.workspace === 'hr')) return false;
      if (permSearch && !p.label.toLowerCase().includes(permSearch.toLowerCase()) && !p.permission.toLowerCase().includes(permSearch.toLowerCase())) return false;
      return true;
    });
  }, [userPerms, workspace, permSearch]);

  const bySource = useMemo(() => {
    const counts: Record<string, number> = {};
    (userPerms?.effective || []).forEach((p) => { counts[p.source || 'default_deny'] = (counts[p.source || 'default_deny'] || 0) + 1; });
    return counts;
  }, [userPerms]);

  const overrideCount = userPerms?.overrides?.length ?? 0;
  const workspaces = Array.from(new Set((userPerms?.effective || []).map((p) => p.workspace)));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search employees by name or email…"
            className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
          />
        </div>
        {searching && <p className="text-xs text-gray-400 mt-2">Searching…</p>}
        {!selectedUser && searchResults.length > 0 && (
          <div className="mt-2 border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-56 overflow-y-auto">
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => { setSelectedUser(u); setSearchTerm(''); setSearchResults([]); }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm"
              >
                <span className="font-semibold text-gray-800">{u.first_name} {u.last_name}</span>
                <span className="text-gray-400 ml-2">{u.email}</span>
              </button>
            ))}
          </div>
        )}

        {selectedUser && (
          <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-black text-gray-900">{selectedUser.first_name} {selectedUser.last_name}</p>
              <p className="text-xs text-gray-400">{selectedUser.email}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(userPerms?.roles ?? []).map((r) => (
                  <span key={r} className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', ROLE_LABELS[r]?.color ?? 'bg-gray-100 text-gray-600')}>
                    {ROLE_LABELS[r]?.label ?? r}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {overrideCount > 0 && (
                <button onClick={handleClearAll} className="px-3 h-8 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                  Clear all ({overrideCount})
                </button>
              )}
              <button onClick={() => setSelectedUser(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white">
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          {loadingPerms ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading permissions…</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <PermissionSummary total={userPerms?.effective?.length || 0} granted={(userPerms?.effective || []).filter((p) => p.granted).length} bySource={bySource} />
                <div className="flex items-center gap-2">
                  <WorkspaceSelector workspaces={workspaces} selected={workspace} onChange={setWorkspace} />
                </div>
              </div>
              <div className="mb-4"><PermissionSearch onSearch={setPermSearch} placeholder="Search this workspace's permissions…" /></div>

              <div className="divide-y divide-gray-50">
                {filtered.map((def) => {
                  const isOverride = def.source === 'override_grant' || def.source === 'override_deny';
                  const meta = SOURCE_META[def.source || 'default_deny'];
                  return (
                    <div key={def.permission} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{def.label}</p>
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-md', meta.color)}>{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button title="Grant" onClick={() => handleOverride(def.permission, true)} className={cn('p-1.5 rounded-lg', def.source === 'override_grant' ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-green-600 hover:bg-green-50')}>
                          <CheckCircle2 size={16} />
                        </button>
                        <button title="Deny" onClick={() => handleOverride(def.permission, false)} className={cn('p-1.5 rounded-lg', def.source === 'override_deny' ? 'text-red-600 bg-red-50' : 'text-gray-300 hover:text-red-600 hover:bg-red-50')}>
                          <XCircle size={16} />
                        </button>
                        {isOverride && (
                          <button title="Remove override" onClick={() => handleRemoveOverride(def.permission)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No permissions match the current filters.</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UserOverridePanel;
