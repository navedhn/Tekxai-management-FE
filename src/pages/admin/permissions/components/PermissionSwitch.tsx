import React from 'react';
import Switch from '@/components/ui/Switch';
import { cn } from '@/utils/cn';

interface PermissionSwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  inherited?: boolean; // granted only via a parent role — shown dimmed, still togglable to make it a direct grant
  title?: string;
}

const PermissionSwitch: React.FC<PermissionSwitchProps> = ({ checked, onChange, disabled, inherited, title }) => (
  <span className="inline-flex items-center gap-1.5" title={title}>
    <Switch checked={checked} onChange={onChange} disabled={disabled} size="sm" className={cn(inherited && checked && 'opacity-60')} />
    {inherited && checked && <span className="text-[9px] font-bold text-gray-400 uppercase">inh.</span>}
  </span>
);

export default PermissionSwitch;
