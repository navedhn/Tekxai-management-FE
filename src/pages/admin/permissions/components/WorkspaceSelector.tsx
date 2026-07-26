import React from 'react';
import Tabs from '@/components/ui/Tabs';

// Two workspaces, not three — HR was merged into the unified Admin/ERP
// sidebar on 2026-07-23; there is no live separate HR workspace left to
// represent here. CRM stays its own tab: it's real, live, and actively
// expanding (Sales CRM Phase 2 work in progress in be-work as of this
// writing). See permission-keys.js for why the underlying hr.* keys are
// kept (not deleted) even though this selector no longer surfaces them.
export const WORKSPACE_LABELS: Record<string, string> = {
  erp: 'ERP',
  crm: 'CRM',
};

interface WorkspaceSelectorProps {
  workspaces: string[];
  selected: string;
  onChange: (workspace: string) => void;
  counts?: Record<string, number>;
}

const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({ workspaces, selected, onChange, counts }) => {
  const visible = workspaces.filter((w) => w === 'erp' || w === 'crm');
  return (
    <Tabs
      variant="pills"
      size="sm"
      options={visible.map((w) => ({ label: WORKSPACE_LABELS[w] || w, value: w, count: counts?.[w] }))}
      value={selected}
      onChange={onChange}
    />
  );
};

export default WorkspaceSelector;
