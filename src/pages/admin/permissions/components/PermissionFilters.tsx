import React from 'react';

interface PermissionFiltersProps {
  modules: string[];
  actions: string[];
  scopes?: string[];
  moduleFilter: string;
  actionFilter: string;
  scopeFilter?: string;
  onModuleChange: (v: string) => void;
  onActionChange: (v: string) => void;
  onScopeChange?: (v: string) => void;
}

function label(v: string) {
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const selectCls = 'h-10 px-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-primary-400';

// Module / Action / Scope filters — the three dimensions the redesign spec
// asked for beyond Workspace (which has its own dedicated selector already).
const PermissionFilters: React.FC<PermissionFiltersProps> = ({
  modules, actions, scopes, moduleFilter, actionFilter, scopeFilter, onModuleChange, onActionChange, onScopeChange,
}) => (
  <>
    <select className={selectCls} value={moduleFilter} onChange={(e) => onModuleChange(e.target.value)}>
      <option value="">All Modules</option>
      {modules.map((m) => <option key={m} value={m}>{label(m)}</option>)}
    </select>
    <select className={selectCls} value={actionFilter} onChange={(e) => onActionChange(e.target.value)}>
      <option value="">All Actions</option>
      {actions.map((a) => <option key={a} value={a}>{label(a)}</option>)}
    </select>
    {scopes && onScopeChange && (
      <select className={selectCls} value={scopeFilter || ''} onChange={(e) => onScopeChange(e.target.value)}>
        <option value="">All Scopes</option>
        {scopes.map((s) => <option key={s} value={s}>{label(s)}</option>)}
      </select>
    )}
  </>
);

export default PermissionFilters;
