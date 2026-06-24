import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Shield, ChevronDown, ChevronUp, Save, AlertCircle,
  Search, Users, User, Trash2, CheckCircle2, XCircle, RefreshCw, X,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  usePermissionsMatrix,
  useSaveRolePermissions,
  useUserPermissions,
  useSetUserPermission,
  useDeleteUserPermission,
  useClearUserPermissions,
  PermissionDef,
  UserPermissionsData,
} from '@/services/permissionsService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/utils/cn';

// ── Role display config ───────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN:            { label: 'Admin',            color: 'bg-blue-100 text-blue-700' },
  HR:               { label: 'HR',               color: 'bg-green-100 text-green-700' },
  DIVISION_MANAGER: { label: 'Division Manager', color: 'bg-purple-100 text-purple-700' },
  MARKETING:        { label: 'Marketing / CRM',  color: 'bg-orange-100 text-orange-700' },
  EMPLOYEE:         { label: 'Employee',         color: 'bg-gray-100 text-gray-700' },
};

const WORKSPACE_LABELS: Record<string, { label: string; accent: string }> = {
  erp: { label: 'ERP Workspace', accent: 'border-blue-400 bg-blue-50' },
  crm: { label: 'CRM Workspace', accent: 'border-orange-400 bg-orange-50' },
  hr:  { label: 'HR Workspace',  accent: 'border-green-400 bg-green-50' },
};

// ── Toggle button (Yes / No) ──────────────────────────────────────────────────
const ToggleYesNo: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={cn(
      'w-16 h-8 rounded-xl flex items-center justify-center transition-all border text-xs font-black',
      checked
        ? 'bg-primary-500 border-primary-500 text-white shadow-sm shadow-primary-200'
        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
    )}
    title={checked ? 'Revoke' : 'Grant'}
  >
    {checked ? 'Yes' : 'No'}
  </button>
);

// ── Source badge ─────────────────────────────────────────────────────────────
const SourceBadge: React.FC<{ source: string }> = ({ source }) => {
  const map: Record<string, { label: string; cls: string }> = {
    role:           { label: 'Role',    cls: 'bg-blue-50 text-blue-600' },
    override_grant: { label: 'Override ✓', cls: 'bg-green-50 text-green-700 border border-green-200' },
    override_deny:  { label: 'Override ✗', cls: 'bg-red-50 text-red-700 border border-red-200' },
    default_deny:   { label: 'Denied',  cls: 'bg-gray-50 text-gray-400' },
  };
  const cfg = map[source] || { label: source, cls: 'bg-gray-50 text-gray-500' };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cfg.cls}`}>{cfg.label}</span>;
};

// ── User override panel ───────────────────────────────────────────────────────
const UserOverridePanel: React.FC = () => {
  const toast = useToastContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedWs, setSelectedWs] = useState('erp');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: userPerms, isLoading: loadingPerms } = useUserPermissions(selectedUser?.id);
  const setPermMutation   = useSetUserPermission();
  const deletePermMutation = useDeleteUserPermission();
  const clearMutation     = useClearUserPermissions();

  const doSearch = useCallback(async (term: string) => {
    if (!term.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res: any = await apiRequest(`api/v1/user?search=${encodeURIComponent(term)}&limit=20`);
      setSearchResults(res?.payload?.records ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 350);
  };

  const selectUser = (u: any) => {
    setSelectedUser(u);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleOverride = async (permission: string, granted: boolean) => {
    if (!selectedUser) return;
    try {
      await setPermMutation.mutateAsync({ userId: selectedUser.id, permission, granted });
      toast.success(`Override set: ${permission} → ${granted ? 'granted' : 'denied'}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to set override');
    }
  };

  const handleRemoveOverride = async (permission: string) => {
    if (!selectedUser) return;
    try {
      await deletePermMutation.mutateAsync({ userId: selectedUser.id, permission });
      toast.success('Override removed — reverted to role default');
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

  // Group effective permissions by workspace → module
  const byWorkspace = useMemo(() => {
    if (!userPerms?.effective) return {};
    const out: Record<string, Record<string, PermissionDef[]>> = {};
    for (const def of userPerms.effective) {
      if (!out[def.workspace]) out[def.workspace] = {};
      if (!out[def.workspace][def.module]) out[def.workspace][def.module] = [];
      out[def.workspace][def.module].push(def);
    }
    return out;
  }, [userPerms?.effective]);

  const overrideCount = userPerms?.overrides.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* User search */}
      <Card className="p-5 rounded-[2rem] border-none shadow-xl">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Search User</h3>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          {searching && <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden shadow-lg">
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => selectUser(u)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
              >
                {u.avatar
                  ? <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" />
                  : <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center"><User size={14} className="text-primary-600" /></div>
                }
                <div>
                  <p className="text-sm font-semibold text-gray-900">{u.first_name} {u.last_name}</p>
                  <p className="text-[11px] text-gray-500">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Selected user */}
      {selectedUser && (
        <>
          <Card className="p-5 rounded-[2rem] border-none shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {selectedUser.avatar
                  ? <img src={selectedUser.avatar} className="w-10 h-10 rounded-xl object-cover" />
                  : <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center"><User size={18} className="text-primary-600" /></div>
                }
                <div>
                  <p className="font-black text-gray-900">{selectedUser.first_name} {selectedUser.last_name}</p>
                  <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(userPerms?.roles ?? []).map(r => (
                      <span key={r} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_LABELS[r]?.color ?? 'bg-gray-100 text-gray-600'}`}>{r}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {overrideCount > 0 && (
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={handleClearAll} loading={clearMutation.isPending}>
                    <Trash2 size={13} className="mr-1" />
                    Clear all ({overrideCount})
                  </Button>
                )}
                <button onClick={() => setSelectedUser(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
            </div>
          </Card>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-gray-500">
            <SourceBadge source="role" /> <span>Inherited from role</span>
            <SourceBadge source="override_grant" /> <span>Explicit grant override</span>
            <SourceBadge source="override_deny" /> <span>Explicit deny override</span>
            <SourceBadge source="default_deny" /> <span>No access</span>
          </div>

          {/* Workspace tabs */}
          <div className="flex gap-2 flex-wrap">
            {Object.keys(byWorkspace).map(ws => (
              <button
                key={ws}
                onClick={() => setSelectedWs(ws)}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all border
                  ${selectedWs === ws
                    ? 'bg-primary-500 text-white border-primary-500 shadow-lg shadow-primary-100'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-primary-200'}
                `}
              >
                {WORKSPACE_LABELS[ws]?.label ?? ws.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Permission table */}
          {loadingPerms ? (
            <div className="text-center py-10 text-gray-400">Loading effective permissions…</div>
          ) : byWorkspace[selectedWs] ? (
            <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
              {Object.entries(byWorkspace[selectedWs]).map(([module, defs]) => (
                <div key={module} className="border-b border-gray-50 last:border-0">
                  <div className="px-5 py-2 bg-gray-50">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{module.replace(/_/g, ' ')}</span>
                  </div>
                  {defs.map(def => {
                    const isOverride = def.source === 'override_grant' || def.source === 'override_deny';
                    return (
                      <div key={def.permission} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 gap-3 border-b border-gray-50 last:border-0">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-gray-800">{def.label.split('–')[1]?.trim() || def.label}</span>
                            <SourceBadge source={def.source ?? 'default_deny'} />
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">{def.permission}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Grant override */}
                          <button
                            onClick={() => handleOverride(def.permission, true)}
                            title="Grant override"
                            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all text-xs font-black
                              ${def.granted && isOverride ? 'bg-green-500 text-white border-green-500' : 'bg-white border-gray-200 text-gray-300 hover:border-green-300 hover:text-green-500'}
                            `}
                          >
                            <CheckCircle2 size={15} />
                          </button>
                          {/* Deny override */}
                          <button
                            onClick={() => handleOverride(def.permission, false)}
                            title="Deny override"
                            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all text-xs font-black
                              ${!def.granted && isOverride ? 'bg-red-500 text-white border-red-500' : 'bg-white border-gray-200 text-gray-300 hover:border-red-300 hover:text-red-500'}
                            `}
                          >
                            <XCircle size={15} />
                          </button>
                          {/* Remove override */}
                          {isOverride && (
                            <button
                              onClick={() => handleRemoveOverride(def.permission)}
                              title="Remove override — revert to role default"
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400 transition-all"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </Card>
          ) : null}
        </>
      )}

      {!selectedUser && (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Search for a user above to manage their permission overrides</p>
          <p className="text-sm mt-1 opacity-70">Overrides take precedence over role permissions</p>
        </div>
      )}
    </div>
  );
};

// ── Module section for role-first view ──────────────────────────────────────
const RoleModuleSection: React.FC<{
  module: string;
  definitions: PermissionDef[];
  selectedRole: string;
  localGrants: Record<string, Record<string, boolean>>;
  onToggle: (role: string, permission: string, value: boolean) => void;
}> = ({ module, definitions, selectedRole, localGrants, onToggle }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-black text-gray-700 uppercase tracking-wide">{module.replace(/_/g, ' ')}</span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="divide-y divide-gray-50">
          {definitions.map(def => (
            <div key={def.permission} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 gap-4">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[13px] font-semibold text-gray-800">{def.label.split('–')[1]?.trim() || def.label}</span>
                <span className="text-[10px] text-gray-400 font-mono">{def.permission}</span>
              </div>
              <ToggleYesNo
                checked={localGrants[selectedRole]?.[def.permission] ?? false}
                onChange={v => onToggle(selectedRole, def.permission, v)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const PermissionsPage: React.FC = () => {
  const toast = useToastContext();
  const { data, isLoading } = usePermissionsMatrix();
  const saveMutation = useSaveRolePermissions();

  const [mainTab, setMainTab]   = useState<'roles' | 'users'>('roles');
  const [localGrants, setLocalGrants] = useState<Record<string, Record<string, boolean>>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('erp');
  const [selectedRole, setSelectedRole] = useState<string>('');

  React.useEffect(() => {
    if (data?.by_role && Object.keys(localGrants).length === 0) {
      setLocalGrants(JSON.parse(JSON.stringify(data.by_role)));
    }
  }, [data?.by_role]);

  // Default to first role once data loads
  React.useEffect(() => {
    if (data?.roles?.length && !selectedRole) {
      setSelectedRole(data.roles[0]);
    }
  }, [data?.roles]);

  const roles = data?.roles ?? [];
  const definitions = data?.definitions ?? [];

  const byWorkspace = useMemo(() => {
    const out: Record<string, Record<string, PermissionDef[]>> = {};
    for (const def of definitions) {
      if (!out[def.workspace]) out[def.workspace] = {};
      if (!out[def.workspace][def.module]) out[def.workspace][def.module] = [];
      out[def.workspace][def.module].push(def);
    }
    return out;
  }, [definitions]);

  const handleToggle = (role: string, permission: string, value: boolean) => {
    setLocalGrants(prev => ({ ...prev, [role]: { ...prev[role], [permission]: value } }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    const grants = Object.entries(localGrants[selectedRole] ?? {}).map(([permission, granted]) => ({ permission, granted }));
    try {
      await saveMutation.mutateAsync({ roleName: selectedRole, grants });
      toast.success(`${ROLE_LABELS[selectedRole]?.label ?? selectedRole} permissions saved`);
      setHasChanges(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    }
  };

  const handleReset = () => {
    if (data?.by_role) {
      setLocalGrants(JSON.parse(JSON.stringify(data.by_role)));
      setHasChanges(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Shield size={20} className="text-primary-600" />
          </div>
          Access Control & Permissions
        </h1>
        <p className="text-sm text-gray-500 font-medium ml-13">
          Manage role-level permissions and user-specific overrides. Super Admin always has full access.
        </p>
      </div>

      {/* Super Admin notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700 font-medium">
          <strong>Super Admin</strong> always has full access and cannot be restricted.
          User-level overrides take precedence over role permissions (evaluation: Super Admin → User Override → Role → Deny).
        </p>
      </div>

      {/* Main tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setMainTab('roles')}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all border',
            mainTab === 'roles' ? 'bg-primary-500 text-white border-primary-500 shadow-lg shadow-primary-100' : 'bg-white text-gray-500 border-gray-200 hover:border-primary-200'
          )}
        >
          <Shield size={15} />
          Role Permissions
        </button>
        <button
          onClick={() => setMainTab('users')}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all border',
            mainTab === 'users' ? 'bg-primary-500 text-white border-primary-500 shadow-lg shadow-primary-100' : 'bg-white text-gray-500 border-gray-200 hover:border-primary-200'
          )}
        >
          <Users size={15} />
          User Overrides
        </button>
      </div>

      {/* ── Role permissions tab ─────────────────────────────────────────────── */}
      {mainTab === 'roles' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-gray-400 font-medium">
              Loading permissions matrix…
            </div>
          ) : (
            <>
              {/* Role selector buttons */}
              <div className="flex flex-wrap gap-2 mb-2">
                {roles.map(role => (
                  <button
                    key={role}
                    onClick={() => { setSelectedRole(role); setHasChanges(false); }}
                    className={cn(
                      'px-5 py-2.5 rounded-xl text-sm font-black transition-all border',
                      selectedRole === role
                        ? 'bg-primary-500 text-white border-primary-500 shadow-lg'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-primary-200'
                    )}
                  >
                    {ROLE_LABELS[role]?.label ?? role}
                  </button>
                ))}
              </div>

              {selectedRole && (
                <>
                  {/* Workspace tabs */}
                  <div className="flex gap-2 flex-wrap">
                    {Object.keys(byWorkspace).map(ws => (
                      <button
                        key={ws}
                        onClick={() => setSelectedWorkspace(ws)}
                        className={cn(
                          'px-5 py-2.5 rounded-xl text-sm font-black transition-all border',
                          selectedWorkspace === ws
                            ? 'bg-primary-500 text-white border-primary-500 shadow-lg shadow-primary-100'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-primary-200'
                        )}
                      >
                        {WORKSPACE_LABELS[ws]?.label ?? ws.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Permission list for selectedRole in selectedWorkspace */}
                  {byWorkspace[selectedWorkspace] && (
                    <Card className={cn('border-l-4 rounded-[2rem] border-none shadow-xl overflow-hidden', WORKSPACE_LABELS[selectedWorkspace]?.accent ?? '')}>
                      <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-black text-gray-700">{WORKSPACE_LABELS[selectedWorkspace]?.label ?? selectedWorkspace.toUpperCase()}</span>
                          <span className="text-xs text-gray-400 ml-2">— {ROLE_LABELS[selectedRole]?.label ?? selectedRole}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 font-semibold">
                          <span>Permission</span>
                          <span className="w-16 text-center">Access</span>
                        </div>
                      </div>
                      <div className="p-5 flex flex-col gap-3">
                        {Object.entries(byWorkspace[selectedWorkspace]).map(([module, defs]) => (
                          <RoleModuleSection
                            key={module}
                            module={module}
                            definitions={defs}
                            selectedRole={selectedRole}
                            localGrants={localGrants}
                            onToggle={handleToggle}
                          />
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              )}
            </>
          )}

          {/* Save bar */}
          <div className={cn(
            'sticky bottom-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 px-8 py-5 -mx-4 transition-all',
            hasChanges ? 'shadow-2xl' : 'opacity-0 pointer-events-none'
          )}>
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-amber-600 font-semibold">
                <AlertCircle size={16} />
                Unsaved changes for {ROLE_LABELS[selectedRole]?.label ?? selectedRole}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="h-11 rounded-xl px-6" onClick={handleReset}>
                  Reset
                </Button>
                <Button
                  variant="primary"
                  className="h-11 rounded-xl px-8 font-black shadow-lg shadow-primary-100 flex items-center gap-2"
                  onClick={handleSave}
                  loading={saveMutation.isPending}
                >
                  <Save size={16} />
                  Save {ROLE_LABELS[selectedRole]?.label ?? selectedRole} Permissions
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── User overrides tab ───────────────────────────────────────────────── */}
      {mainTab === 'users' && <UserOverridePanel />}
    </div>
  );
};

export default PermissionsPage;
