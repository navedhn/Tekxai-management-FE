import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { useToastContext } from '@/components/toast/ToastProvider';
import { usePermissionsCatalog, useUpdateCatalogEntry, CatalogEntry } from '@/services/permissionsService';
import PermissionSearch from './PermissionSearch';

// Permissions Library — every permission the code actually enforces, kept
// in sync automatically (server-side, on every start — see
// sync_permission_catalog) so this never drifts from reality. Admins own
// category / deprecated / system here; permission/label/workspace/module/
// action are code-derived and shown read-only (see permission-keys.js for
// why a permission's existence can't be admin-authored from thin air).
const PermissionsLibraryPanel: React.FC = () => {
  const toast = useToastContext();
  const [workspace, setWorkspace] = useState('');
  const [search, setSearch] = useState('');
  const { data: entries = [], isLoading } = usePermissionsCatalog({ workspace: workspace || undefined });
  const updateMutation = useUpdateCatalogEntry();

  const filtered = entries.filter((e) =>
    !search || e.label.toLowerCase().includes(search.toLowerCase()) || e.permission.toLowerCase().includes(search.toLowerCase()));

  const toggleDeprecated = (entry: CatalogEntry) => {
    updateMutation.mutate({ id: entry.id, is_deprecated: !entry.is_deprecated }, {
      onError: (e: any) => toast.error(e?.message || 'Failed to update'),
    });
  };

  const setCategory = (entry: CatalogEntry, category: string) => {
    updateMutation.mutate({ id: entry.id, category: category || null }, {
      onError: (e: any) => toast.error(e?.message || 'Failed to update'),
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-gray-900">Permissions Library</h3>
          <p className="text-xs text-gray-400 mt-0.5">{entries.length} permissions currently enforced in code, synced automatically.</p>
        </div>
        <select className="h-9 px-3 border border-gray-200 rounded-xl text-xs text-gray-700" value={workspace} onChange={(e) => setWorkspace(e.target.value)}>
          <option value="">All Workspaces</option>
          <option value="erp">ERP</option>
          <option value="crm">CRM</option>
          <option value="hr">HR (legacy keys)</option>
        </select>
      </div>

      <div className="mb-4"><PermissionSearch onSearch={setSearch} /></div>

      {isLoading ? (
        <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Permission', 'Module', 'Action', 'Category', 'Status'].map((h) => (
                  <th key={h} className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide py-2 px-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((entry) => (
                <tr key={entry.id} className={cn('hover:bg-gray-50/60', entry.is_deprecated && 'opacity-50')}>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-gray-700">{entry.label}</p>
                    <code className="text-[11px] text-gray-400">{entry.permission}</code>
                  </td>
                  <td className="py-2.5 px-3 text-gray-500">{entry.module.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 px-3 text-gray-500">{entry.action}</td>
                  <td className="py-2.5 px-3">
                    <input
                      defaultValue={entry.category || ''}
                      onBlur={(e) => { if (e.target.value !== (entry.category || '')) setCategory(entry, e.target.value); }}
                      placeholder="Uncategorized"
                      className="w-full h-8 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary-400"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => toggleDeprecated(entry)}
                      className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', entry.is_deprecated ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600')}
                    >
                      {entry.is_deprecated ? 'Deprecated' : 'Active'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400">No permissions match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PermissionsLibraryPanel;
