import React from 'react';
import PermissionSwitch from './PermissionSwitch';
import { PermissionDef, PermissionScope } from '@/services/permissionsService';

const STANDARD_ACTION_ORDER = ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'print', 'archive', 'restore', 'manage', 'configure'];

function moduleLabel(module: string) {
  return module.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PermissionMatrixProps {
  definitions: PermissionDef[];
  grants: Record<string, boolean>;
  scopes?: Record<string, PermissionScope>;
  inheritedKeys?: Set<string>;
  onToggle: (permission: string, value: boolean) => void;
  onScopeChange?: (permission: string, scope: PermissionScope) => void;
  readOnly?: boolean;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ definitions, grants, scopes, inheritedKeys, onToggle, onScopeChange, readOnly }) => {
  if (definitions.length === 0) {
    return <div className="py-16 text-center text-sm text-gray-400">No permissions match the current filters.</div>;
  }

  const moduleGroups = Array.from(new Set(definitions.map((d) => `${d.workspace}:${d.module}`)));
  const distinctWorkspacesByModule = new Map<string, Set<string>>();
  definitions.forEach((d) => {
    if (!distinctWorkspacesByModule.has(d.module)) distinctWorkspacesByModule.set(d.module, new Set());
    distinctWorkspacesByModule.get(d.module)!.add(d.workspace);
  });

  const actionsPresent = Array.from(new Set(definitions.map((d) => d.action)));
  const actions = [
    ...STANDARD_ACTION_ORDER.filter((a) => actionsPresent.includes(a)),
    ...actionsPresent.filter((a) => !STANDARD_ACTION_ORDER.includes(a)),
  ];

  const byModuleAction = new Map<string, PermissionDef>();
  definitions.forEach((d) => byModuleAction.set(`${d.workspace}:${d.module}:${d.action}`, d));

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide py-3 px-4 sticky left-0 bg-gray-50 z-10 min-w-[170px]">Module</th>
            {actions.map((a) => (
              <th key={a} className="text-center text-xs font-bold text-gray-500 uppercase tracking-wide py-3 px-3 whitespace-nowrap">{a}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {moduleGroups.map((group) => {
            const [groupWorkspace, module] = group.split(':');

            const needsSuffix = (distinctWorkspacesByModule.get(module)?.size ?? 1) > 1;
            const rowLabel = needsSuffix ? `${moduleLabel(module)} (${groupWorkspace.toUpperCase()})` : moduleLabel(module);
            return (
            <tr key={group} className="hover:bg-primary-50/30 transition-colors">
              <td className="py-3 px-4 font-semibold text-gray-700 sticky left-0 z-10 bg-white min-w-[170px] whitespace-nowrap">{rowLabel}</td>
              {actions.map((action) => {
                const def = byModuleAction.get(`${group}:${action}`);
                if (!def) return <td key={action} className="text-center py-3 px-3 text-gray-300">—</td>;
                const checked = grants[def.permission] ?? false;
                const inherited = inheritedKeys?.has(def.permission) ?? false;
                return (
                  <td key={action} className="text-center py-3 px-3">
                    <PermissionSwitch
                      checked={checked}
                      onChange={(v) => onToggle(def.permission, v)}
                      disabled={readOnly}
                      inherited={inherited}
                      title={def.label}
                      scope={scopes?.[def.permission]}
                      onScopeChange={onScopeChange ? (s) => onScopeChange(def.permission, s) : undefined}
                    />
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PermissionMatrix;
