import React, { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { useCreateTeamMutation, useUpdateTeamMutation } from '@/services/adminService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

const DEFAULT_TYPES = [
  { value: 'DEVELOPMENT',  label: 'Development' },
  { value: 'DESIGN',       label: 'Design' },
  { value: 'QA',           label: 'Quality Assurance' },
  { value: 'MANAGEMENT',   label: 'Management' },
  { value: 'HR',           label: 'Human Resource' },
  { value: 'MARKETING',    label: 'Marketing' },
  { value: 'SALES',        label: 'Sales' },
  { value: 'DEVOPS',       label: 'DevOps' },
  { value: 'OTHER',        label: 'Other' },
];

const STORAGE_KEY = 'tekxai_custom_team_types';

function loadCustomTypes(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveCustomType(val: string) {
  const existing = loadCustomTypes();
  if (!existing.includes(val)) localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, val]));
}

interface Props { isOpen: boolean; onClose: () => void; team?: any; }

const TeamFormModal: React.FC<Props> = ({ isOpen, onClose, team }) => {
  const [formData, setFormData] = useState({ name: '', type: 'DEVELOPMENT', description: '' });
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [dropOpen, setDropOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);
  const [customTypes, setCustomTypes]   = useState<string[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  const toast      = useToastContext();
  const createTeam = useCreateTeamMutation();
  const updateTeam = useUpdateTeamMutation();
  const isEdit     = !!team;

  useEffect(() => {
    setCustomTypes(loadCustomTypes());
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setFormData(team
        ? { name: team.name || '', type: team.type || 'DEVELOPMENT', description: team.description || '' }
        : { name: '', type: 'DEVELOPMENT', description: '' }
      );
      setErrors({});
      setDropOpen(false);
      setAddingCustom(false);
      setCustomInput('');
    }
  }, [team, isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
        setAddingCustom(false);
        setCustomInput('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allOptions = [
    ...DEFAULT_TYPES,
    ...customTypes
      .filter(c => !DEFAULT_TYPES.some(d => d.value === c))
      .map(c => ({ value: c, label: c })),
  ];

  const selectedLabel = allOptions.find(o => o.value === formData.type)?.label || formData.type;

  const selectType = (val: string) => {
    setFormData(p => ({ ...p, type: val }));
    setDropOpen(false);
    setAddingCustom(false);
    setCustomInput('');
    setErrors(p => ({ ...p, type: '' }));
  };

  const handleAddCustom = () => {
    const val = customInput.trim().toUpperCase().replace(/\s+/g, '_');
    if (!val) return;
    saveCustomType(val);
    setCustomTypes(loadCustomTypes());
    selectType(val);
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Team name is required';
    if (!formData.type) newErrors.type = 'Team type is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const mutation = isEdit
      ? updateTeam.mutate({ id: team.id, data: formData }, {
          onSuccess: () => { toast.success('Team updated successfully'); onClose(); },
          onError: (e: any) => toast.error(e.message || 'Failed to update team'),
        })
      : createTeam.mutate(formData, {
          onSuccess: () => { toast.success('Team created successfully'); onClose(); },
          onError: (e: any) => toast.error(e.message || 'Failed to create team'),
        });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Team' : 'Add New Team'} size="md">
      <div className="flex flex-col gap-5">
        <Input
          label="Team Name *"
          name="name"
          value={formData.name}
          onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
          error={errors.name}
          placeholder="e.g. Frontend Avengers"
          className="h-12 rounded-xl"
        />

        {/* Custom team type selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Team Type *</label>
          <div className="relative" ref={dropRef}>
            <button
              type="button"
              onClick={() => { setDropOpen(p => !p); setAddingCustom(false); setCustomInput(''); }}
              className={cn(
                'w-full h-12 px-4 flex items-center justify-between rounded-xl border text-sm font-semibold text-gray-700 bg-white transition-colors',
                errors.type ? 'border-red-400' : dropOpen ? 'border-primary-400 ring-2 ring-primary-100' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span>{selectedLabel}</span>
              <ChevronDown size={16} className={cn('text-gray-400 transition-transform', dropOpen && 'rotate-180')} />
            </button>

            {dropOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="max-h-52 overflow-y-auto">
                  {allOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => selectType(opt.value)}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-primary-50 hover:text-primary-700 transition-colors',
                        formData.type === opt.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Add custom type */}
                <div className="border-t border-gray-100 p-2">
                  {addingCustom ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddCustom(); if (e.key === 'Escape') { setAddingCustom(false); setCustomInput(''); } }}
                        placeholder="e.g. Support"
                        className="flex-1 h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustom}
                        className="px-3 h-9 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingCustom(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <Plus size={14} /> Add custom type
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          {errors.type && <p className="text-xs text-red-500 mt-0.5">{errors.type}</p>}
        </div>

        <Textarea
          label="Description"
          name="description"
          value={formData.description}
          onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
          placeholder="What does this team focus on?"
          className="min-h-[120px]"
        />

        <div className="flex gap-3 mt-2">
          <Button variant="outline" fullWidth className="h-12 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary" fullWidth
            loading={createTeam.isPending || updateTeam.isPending}
            className="h-12 rounded-xl font-bold shadow-lg shadow-primary-100"
            onClick={handleSubmit}
          >
            {isEdit ? 'Save Changes' : 'Create Team'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TeamFormModal;
