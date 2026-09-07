import React from 'react';
import Tabs from '@/components/ui/Tabs';

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
