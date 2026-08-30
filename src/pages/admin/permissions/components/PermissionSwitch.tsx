import React from 'react';
import Switch from '@/components/ui/Switch';
import { cn } from '@/utils/cn';
import type { PermissionScope } from '@/services/permissionsService';

const SCOPE_OPTIONS: PermissionScope[] = ['ALL', 'TEAM', 'DEPARTMENT', 'OWN'];

interface PermissionSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  inherited?: boolean; // granted only via a parent role — shown dimmed, still togglable to make it a direct grant
  title?: string;
  // Scope controls are optional — omit both to keep a plain boolean switch
  // (e.g. inside a context that never surfaces scope, like the read-only
  // Library tab). When present, the dropdown only renders once `checked` is
  // true: an ungranted permission has no scope to narrow.
  scope?: PermissionScope;
  onScopeChange?: (scope: PermissionScope) => void;
}

const PermissionSwitch: React.FC<PermissionSwitchProps> = ({ checked, onChange, disabled, inherited, title, scope, onScopeChange }) => (
  <span className="inline-flex items-center gap-1.5" title={title}>
    <Switch checked={checked} onChange={onChange} disabled={disabled} size="sm" className={cn(inherited && checked && 'opacity-60')} />
    {inherited && checked && <span className="text-[9px] font-bold text-gray-400 uppercase">inh.</span>}
    {checked && onScopeChange && (
      <select
        value={scope ?? 'ALL'}
        disabled={disabled}
        onChange={(e) => onScopeChange(e.target.value as PermissionScope)}
        title="Data scope this grant applies at. Only permissions whose backend enforcement actually consults scope will respect anything narrower than ALL — see the Access Control docs for which modules are scope-aware."
        className="text-[10px] font-bold border border-gray-200 rounded-md px-1 py-0.5 bg-white text-gray-600 disabled:opacity-40"
      >
        {SCOPE_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    )}
  </span>
);

export default PermissionSwitch;
