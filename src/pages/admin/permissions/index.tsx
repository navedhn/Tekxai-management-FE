import React, { useEffect, useMemo, useState } from 'react';
import { Shield, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import Tabs from '@/components/ui/Tabs';
import { useToastContext } from '@/components/toast/ToastProvider';
import { usePermissionsMatrix, useSaveRolePermissions, PermissionDef } from '@/services/permissionsService';

import RoleSelector from './components/RoleSelector';
import WorkspaceSelector from './components/WorkspaceSelector';
import PermissionMatrix from './components/PermissionMatrix';
import PermissionSearch from './components/PermissionSearch';
import PermissionFilters from './components/PermissionFilters';
import PermissionSummary from './components/PermissionSummary';
import UserOverridePanel from './components/UserOverridePanel';
import ApprovalRulesPanel from './components/ApprovalRulesPanel';
import PermissionAuditLog from './components/PermissionAuditLog';
import PermissionTemplatesPanel from './components/PermissionTemplatesPanel';
import PermissionsLibraryPanel from './components/PermissionsLibraryPanel';

const MAIN_TABS = [
  { label: 'Roles', value: 'roles' },
  { label: 'Templates', value: 'templates' },
  { label: 'Library', value: 'library' },
  { label: 'User Overrides', value: 'users' },
  { label: 'Approval Rules', value: 'approvals' },
  { label: 'Audit Log', value: 'audit' },
];

// Enterprise Access Control page. Replaces the old always-expanded
// accordion layout with: a searchable role list, a dense sticky-header
// permission matrix (module x action) instead of long Yes/No rows, real
// switches, search + module/action filters, and two entirely new
// capabilities the old page never had — configurable Approval Rules and a
// Permission Audit Log. The ERP/CRM/HR three-workspace split is gone: HR
// was merged into the unified Admin sidebar on 2026-07-23, so this page now
// shows exactly two workspaces (ERP, CRM), with the still-live hr.* keys
// folded into the ERP view rather than deleted outright (see
// permission-keys.js for why the underlying data migration is a separate,
// deliberately-not-yet-executed step).
export default function PermissionsPage() {
  const toast = useToastContext();
  const [mainTab, setMainTab] = useState<'roles' | 'templates' | 'library' | 'users' | 'approvals' | 'audit'>('roles');

  const { data, isLoading } = usePermissionsMatrix();
  const saveMutation = useSaveRolePermissions();

  // Only ever holds permissions the user has actually toggled in this session,
  // keyed by role then permission — never a full snapshot of the matrix. This
  // is deliberate: server data (data.by_role) is always the source of truth
  // for anything the user hasn't touched, so a stale/unrefreshed local copy
  // can never be sent back to the server and overwrite a concurrent change
  // (see incident postmortem, 2026-08-26 — a one-time full-snapshot copy that
  // never re-synced was sent wholesale on Save and wiped 43 real grants).
  const [pendingEdits, setPendingEdits] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedRole, setSelectedRole] = useState('');
  const [workspace, setWorkspace] = useState('erp');
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (data?.roles?.length && !selectedRole) setSelectedRole(data.roles[0]);
  }, [data, selectedRole]);

  const definitions: PermissionDef[] = data?.definitions || [];

  // ERP view folds in the still-live hr.* keys (see file header) — CRM
  // stays its own, unmixed workspace.
  const workspaceDefs = useMemo(
    () => definitions.filter((d) => (workspace === 'erp' ? d.workspace === 'erp' || d.workspace === 'hr' : d.workspace === workspace)),
    [definitions, workspace],
  );

  const modules = useMemo(() => Array.from(new Set(workspaceDefs.map((d) => d.module))), [workspaceDefs]);
  const actions = useMemo(() => Array.from(new Set(workspaceDefs.map((d) => d.action))), [workspaceDefs]);

  const filteredDefs = useMemo(() => workspaceDefs.filter((d) => {
    if (moduleFilter && d.module !== moduleFilter) return false;
    if (actionFilter && d.action !== actionFilter) return false;
    if (search && !d.label.toLowerCase().includes(search.toLowerCase()) && !d.permission.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [workspaceDefs, moduleFilter, actionFilter, search]);

  // Server truth for the selected role, overlaid with any un-saved local edits.
  const serverGrants = data?.by_role?.[selectedRole] || {};
  const roleEdits = pendingEdits[selectedRole] || {};
  const roleGrants = useMemo(() => ({ ...serverGrants, ...roleEdits }), [serverGrants, roleEdits]);
  const grantedInWorkspace = workspaceDefs.filter((d) => roleGrants[d.permission]).length;

  const hasChanges = Object.keys(roleEdits).length > 0;

  const grantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (data?.roles || []).forEach((r) => {
      const merged = { ...(data?.by_role?.[r] || {}), ...(pendingEdits[r] || {}) };
      counts[r] = Object.values(merged).filter(Boolean).length;
    });
    return counts;
  }, [data, pendingEdits]);

  const handleToggle = (permission: string, value: boolean) => {
    setPendingEdits((prev) => {
      const nextRoleEdits = { ...prev[selectedRole], [permission]: value };
      // Toggling back to the server's actual value means there's nothing to save for this key.
      if (serverGrants[permission] === value) delete nextRoleEdits[permission];
      return { ...prev, [selectedRole]: nextRoleEdits };
    });
    setWarnings([]);
  };

  const handleSelectRole = (role: string) => {
    setSelectedRole(role);
    setWarnings([]);
  };

  const handleSave = async () => {
    // Delta only — never the full matrix. Anything the user hasn't touched
    // is left exactly as the server already has it. `previous` is what this
    // tab believes is currently granted for each key — the backend rejects
    // the whole save (409) if that no longer matches reality, instead of
    // silently overwriting a change made elsewhere since this tab loaded.
    const grants = Object.entries(roleEdits).map(([permission, granted]) => ({
      permission, granted, previous: serverGrants[permission] ?? false,
    }));
    if (!grants.length) return;
    try {
      const res: any = await saveMutation.mutateAsync({ roleName: selectedRole, grants });
      setPendingEdits((prev) => ({ ...prev, [selectedRole]: {} }));
      const w = res?.payload?.warnings || [];
      setWarnings(w);
      toast.success(w.length ? `Permissions saved with ${w.length} warning(s)` : 'Permissions saved');
    } catch (e: any) {
      const conflicts = e?.data?.conflicts;
      if (conflicts?.length) {
        toast.error(`Someone else changed ${conflicts.length} of these permissions since this page loaded. Refresh and re-apply your changes.`);
      } else {
        toast.error(e?.message || e?.data?.message || 'Failed to save permissions');
      }
    }
  };

  const handleReset = () => {
    setPendingEdits((prev) => ({ ...prev, [selectedRole]: {} }));
    setWarnings([]);
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Shield size={22} className="text-primary-600" /> Access Control</h1>
          <p className="text-sm text-gray-400 mt-0.5">Roles, permissions, data scope, approval thresholds, and audit history.</p>
        </div>
        <Tabs
          options={MAIN_TABS}
          value={mainTab}
          onChange={(v) => setMainTab(v as typeof mainTab)}
          variant="pills"
        />
      </div>

      {mainTab === 'roles' && (
        isLoading ? (
          <div className="py-20 text-center text-sm text-gray-400">Loading permissions…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
            <RoleSelector roles={data?.roles || []} selectedRole={selectedRole} onSelect={handleSelectRole} grantCounts={grantCounts} />

            <div className="flex flex-col gap-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <PermissionSummary total={workspaceDefs.length} granted={grantedInWorkspace} />
                <WorkspaceSelector workspaces={['erp', 'crm']} selected={workspace} onChange={setWorkspace} />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <PermissionSearch onSearch={setSearch} />
                <PermissionFilters
                  modules={modules}
                  actions={actions}
                  moduleFilter={moduleFilter}
                  actionFilter={actionFilter}
                  onModuleChange={setModuleFilter}
                  onActionChange={setActionFilter}
                />
              </div>

              {warnings.length > 0 && (
                <div className="flex flex-col gap-1.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  {warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-semibold text-amber-700">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {w}
                    </div>
                  ))}
                </div>
              )}

              <PermissionMatrix
                definitions={filteredDefs}
                grants={roleGrants}
                onToggle={handleToggle}
              />
            </div>
          </div>
        )
      )}

      {mainTab === 'templates' && <PermissionTemplatesPanel roles={data?.roles || []} />}
      {mainTab === 'library' && <PermissionsLibraryPanel />}
      {mainTab === 'users' && <UserOverridePanel />}
      {mainTab === 'approvals' && <ApprovalRulesPanel roles={data?.roles || []} />}
      {mainTab === 'audit' && <PermissionAuditLog />}

      {mainTab === 'roles' && (
        <div
          className={`fixed bottom-0 left-0 lg:left-[var(--spacing-sidebar)] right-0 bg-white border-t border-gray-100 shadow-2xl px-6 py-4 flex items-center justify-between z-30 transition-all ${
            hasChanges ? 'opacity-100' : 'opacity-0 pointer-events-none translate-y-2'
          }`}
        >
          <span className="text-sm font-bold text-gray-600">Unsaved changes to {selectedRole}</span>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} className="flex items-center gap-1.5 px-4 h-10 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              <RotateCcw size={14} /> Reset
            </button>
            <button onClick={handleSave} disabled={saveMutation.isPending} className="flex items-center gap-1.5 px-4 h-10 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40">
              <Save size={14} /> {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
