import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {Clock, X, Plus, Search, User ,Loader2, ArrowRight, ListChecks, Pencil, Trash2, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import Button, { IconButton } from './Button';
import Input from './Input';
import SearchableSelect from './SearchableSelect';
import Textarea from './Textarea';
import DatePicker from './DatePicker';
import { ProjectDetail, ProjectDto, ProjectMemberRole, PROJECT_MEMBER_ROLES, useCreateProjectMutation, useUpdateProjectMutation, useClientsLookupQuery } from '@/services/projectService';
import { useFetchUsersQuery } from '@/services/userService';
import { useGetBusinessUnitsQuery } from '@/services/businessUnitService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PROJECT_STATUS_OPTIONS } from '@/utils/projectStatus';
import {
  Milestone,
  useMilestones,
  useDeleteMilestone,
  useReorderMilestones,
} from '@/services/milestonesService';
import CreateMilestoneModal from '@/components/modals/CreateMilestoneModal';
import ActionModal from './ActionModal';

const MILESTONE_STATUS_STYLE: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  BLOCKED: 'bg-red-50 text-red-600',
};

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role?: ProjectMemberRole;
  allocation_percent?: number;
}

interface CreateProjectSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ProjectDetail | null;
}

const AvatarChip: React.FC<{ member: TeamMember; onRemove: () => void }> = ({ member, onRemove }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.85 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.85 }}
    className="flex items-center gap-2 bg-white border border-gray-100 rounded-full pl-1 pr-3 py-1 shadow-sm"
  >
    <img
      src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
      className="w-7 h-7 rounded-full object-cover"
      alt={member.name}
    />
    <span className="text-[13px] font-bold text-gray-700">{member.name}</span>
    <IconButton
      icon={X}
      variant="ghost"
      size="sm"
      aria-label={`Remove ${member.name}`}
      onClick={onRemove}
      className="ml-1 !h-auto !w-auto p-0 text-gray-400 hover:text-red-400"
    />
  </motion.div>
);

const MemberRoleRow: React.FC<{
  member: TeamMember;
  onRoleChange: (role: ProjectMemberRole) => void;
  onAllocationChange: (allocation_percent: number) => void;
  onRemove: () => void;
}> = ({ member, onRoleChange, onAllocationChange, onRemove }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.85 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.85 }}
    className="flex items-center gap-2 bg-white border border-gray-100 rounded-full pl-1 pr-2 py-1 shadow-sm"
  >
    <img
      src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
      className="w-7 h-7 rounded-full object-cover"
      alt={member.name}
    />
    <span className="text-[13px] font-bold text-gray-700">{member.name}</span>
    <SearchableSelect
      options={PROJECT_MEMBER_ROLES.map((r) => ({ label: r.label, value: r.value }))}
      value={member.role || 'MEMBER'}
      onChange={(v) => onRoleChange((v as ProjectMemberRole) ?? 'MEMBER')}
      clearable={false}
      containerClassName="w-auto"
      className="h-auto text-[12px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2 py-1 shadow-none"
    />
    <div className="flex items-center gap-0.5" title="Allocation on this project">
      <input
        type="number"
        min={0}
        max={100}
        value={member.allocation_percent ?? 100}
        onChange={(e) => {
          const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
          onAllocationChange(v);
        }}
        className="w-11 h-auto text-[12px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-1.5 py-1 text-center"
      />
      <span className="text-[11px] font-bold text-gray-400">%</span>
    </div>
    <IconButton
      icon={X}
      variant="ghost"
      size="sm"
      aria-label={`Remove ${member.name}`}
      onClick={onRemove}
      className="!h-auto !w-auto p-0 text-gray-400 hover:text-red-400"
    />
  </motion.div>
);

const UserSelectDropdown: React.FC<{
  onSelect: (user: TeamMember) => void;
  excludeIds: string[];
  placeholder?: string;
}> = ({ onSelect, excludeIds, placeholder = "Add member..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const toast = useToastContext();

  const { data: users, isLoading } = useFetchUsersQuery({ search: searchTerm }, showDropdown);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u: any) => !excludeIds.includes(u.id));
  }, [users, excludeIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowDropdown(!showDropdown)}
        className="h-9 w-9 rounded-full bg-[#005CDA1A] text-[#005CDA] flex items-center justify-center transition-colors shadow-sm"
        title={placeholder}
      >
        <Plus size={16} strokeWidth={2.5} />
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden p-2"
          >
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:ring-1 focus:ring-primary-100"
              />
            </div>
            <div className="max-h-48 overflow-y-auto no-scrollbar flex flex-col gap-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="animate-spin text-primary-500" size={16} />
                </div>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u: any) => (

                  <button
                    key={u.id}
                    onClick={() => {
                      onSelect({ id: u.id, name: `${u.first_name} ${u.last_name}`, avatar: u.avatar });
                      setSearchTerm('');
                      setShowDropdown(false);
                    }}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <img
                      src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.first_name)}&background=random`}
                      className="w-7 h-7 rounded-full"
                      alt=""
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-700">{u.first_name} {u.last_name}</span>
                      <span className="text-[10px] text-gray-400">{u.email}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-gray-400 font-medium">No users found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CreateProjectSlideOver: React.FC<CreateProjectSlideOverProps> = ({ isOpen, onClose, project }) => {
  const toast = useToastContext();
  // Bug fix — Save Changes appeared to do nothing when validation failed
  // (e.g. editing a legacy project with no Project Owner assigned, like
  // "North Star Olive™ - Shopify Website"). Validation WAS correctly
  // blocking the save (setErrors + an inline "At least one project owner
  // is required" message already render at the Project Owners field), but
  // that field sits far below the fold under Estimated Hours/Team
  // Assignment, while Save Changes is a sticky footer always visible
  // regardless of scroll position — so the error was real but invisible.
  // Fix is UI-only: on validation failure, show a toast and scroll the
  // body to the first invalid field (by id, see field-startDate/field-owner
  // below). Does not touch, weaken, or bypass the existing validation
  // rules themselves.
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalHours, setTotalHours] = useState('0');
  const [clientName, setClientName] = useState('');
  const [devStatus, setDevStatus] = useState('');
  const [status, setStatus] = useState('PLANNING');
  const [priority, setPriority] = useState('MEDIUM');
  const [businessUnitId, setBusinessUnitId] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('PKR');

  const [clientId, setClientId] = useState('');
  const [clientDisplayName, setClientDisplayName] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [bidder, setBidder] = useState<TeamMember | null>(null);
  const [bidderSearch, setBidderSearch] = useState('');
  const [source, setSource] = useState('');
  const [commissionType, setCommissionType] = useState<'' | 'PERCENTAGE' | 'FIXED'>('');
  const [commissionValue, setCommissionValue] = useState('');
  const [commissionStatus, setCommissionStatus] = useState<'' | 'FULL_PROJECT_PAID' | 'MILESTONES_PAID' | 'PENDING'>('');

  const [clientTouched, setClientTouched] = useState(false);

  const [projectOwners, setProjectOwners] = useState<TeamMember[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamMember[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();
  const { data: businessUnits = [] } = useGetBusinessUnitsQuery();
  const { data: clientResults = [], isLoading: clientsLoading } = useClientsLookupQuery(clientSearch, true);
  const { data: bidderUsers = [], isLoading: biddersLoading } = useFetchUsersQuery({ search: bidderSearch }, true);

  const isEdit = !!project;

  // Milestones — reuses the exact same canonical hooks/component
  // ProjectDetailsSlideOver's Milestones tab already uses
  // (milestonesService.ts + CreateMilestoneModal), not a parallel
  // implementation. Only relevant once the project actually has an id
  // (isEdit) — a not-yet-created project has nothing to attach a
  // milestone to. useMilestones is passed `null` while creating, which
  // the hook already treats as disabled (see milestonesService.ts).
  const { data: milestones = [], isLoading: milestonesLoading } = useMilestones(project?.id ?? null);
  const deleteMilestoneMutation = useDeleteMilestone(project?.id ?? null);
  const reorderMilestonesMutation = useReorderMilestones(project?.id ?? null);
  const [showCreateMilestone, setShowCreateMilestone] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneToDelete, setMilestoneToDelete] = useState<{ id: string; title: string } | null>(null);
  const activeMilestones = useMemo(
    () => [...milestones].filter((m) => !m.archived_at).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)),
    [milestones],
  );

  const handleConfirmDeleteMilestone = () => {
    if (!milestoneToDelete) return;
    deleteMilestoneMutation.mutate(milestoneToDelete.id, {
      onSuccess: () => { toast.success('Milestone deleted'); setMilestoneToDelete(null); },
      onError: (e: any) => { toast.error(e?.message || 'Failed to delete milestone'); setMilestoneToDelete(null); },
    });
  };

  const moveMilestone = (milestoneId: string, direction: -1 | 1) => {
    const idx = activeMilestones.findIndex((m) => m.id === milestoneId);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= activeMilestones.length) return;
    const next = [...activeMilestones];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    reorderMilestonesMutation.mutate(next.map((m) => m.id), {
      onError: (err: any) => toast.error(err?.message || 'Failed to reorder milestones'),
    });
  };

  useEffect(() => {
    if (project) {
      setProjectName(project.title);
      setDescription(project.description || '');
      setStartDate(project.start_date);
      setEndDate(project.end_date);
      setTotalHours(String(project.total_hours));
      setClientName(project.client_name || '');
      setDevStatus(project.dev_status || '');
      setStatus(project.status || 'PLANNING');
      setPriority(project.priority || 'MEDIUM');
      setBusinessUnitId(project.business_unit_id ? String(project.business_unit_id) : '');
      setBudget(project.budget != null ? String(project.budget) : '');
      setBudgetCurrency(project.budget_currency || 'PKR');

      setClientId(project.client_id || '');
      setClientDisplayName(project.client?.name || '');
      setClientSearch('');
      setClientTouched(false);
      setBidder(project.bidder ? {
        id: project.bidder.id,
        name: `${project.bidder.first_name} ${project.bidder.last_name}`.trim(),
        avatar: project.bidder.avatar || '',
      } : null);
      setBidderSearch('');
      setSource(project.source || '');
      setCommissionType(project.commission_type || '');
      setCommissionValue(project.commission_value != null ? String(project.commission_value) : '');
      setCommissionStatus((project as any).commission_status || '');
      setTeamMembers((project.members || []).map((m) => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name}`.trim(),
        avatar: m.avatar || '',
        role: m.role || 'MEMBER',
        allocation_percent: m.allocation_percent ?? 100,
      })));

      setProjectOwners(project.owner ? [{
        id: project.owner.id,
        name: `${project.owner.first_name} ${project.owner.last_name}`.trim(),
        avatar: project.owner.avatar || '',
      }] : []);
      setTeamLeaders(project.team_leader ? [{
        id: project.team_leader.id,
        name: `${project.team_leader.first_name} ${project.team_leader.last_name}`.trim(),
        avatar: project.team_leader.avatar || '',
      }] : []);
    } else {
      setProjectName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setTotalHours('0');
      setClientName('');
      setDevStatus('');
      setStatus('PLANNING');
      setPriority('MEDIUM');
      setBusinessUnitId('');
      setBudget('');
      setBudgetCurrency('PKR');
      setClientId('');
      setClientDisplayName('');
      setClientSearch('');
      setClientTouched(false);
      setBidder(null);
      setBidderSearch('');
      setSource('');
      setCommissionType('');
      setCommissionValue('');
      setCommissionStatus('');
      setProjectOwners([]);
      setTeamLeaders([]);
      setTeamMembers([]);
    }
  }, [project, isOpen]);

  const handleSubmit = async () => {

    const newErrors: Record<string, string> = {};
    if (!projectName.trim()) newErrors.projectName = 'Project name is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!endDate) newErrors.endDate = 'End date is required';
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      newErrors.endDate = 'End date cannot be before start date';
    }
    if (projectOwners.length === 0) newErrors.owner = 'At least one project owner is required';
    if (budget !== '' && Number(budget) < 0) newErrors.budget = 'Budget cannot be negative';

    const hasCommissionType = commissionType !== '';
    const hasCommissionValue = commissionValue !== '';
    if (hasCommissionType !== hasCommissionValue) {
      newErrors.commission = 'Set both a commission type and value, or leave both empty';
    } else if (hasCommissionValue) {
      const n = Number(commissionValue);
      if (Number.isNaN(n) || n < 0) newErrors.commission = 'Commission value cannot be negative';
      else if (commissionType === 'PERCENTAGE' && n > 100) newErrors.commission = 'Commission percentage cannot exceed 100';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Fix — surface the failure instead of silently doing nothing. The
      // inline field errors already existed; they just weren't
      // discoverable when the failing field was scrolled out of view
      // behind the sticky Save Changes footer.
      toast.error('Please fix the highlighted fields before saving.');
      const firstErrorKey = ['startDate', 'endDate', 'owner', 'commission'].find((k) => newErrors[k]);
      if (firstErrorKey) {
        const el = document.getElementById(`field-${firstErrorKey}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const payload: ProjectDto = {
      title: projectName,
      description,
      start_date: startDate,
      end_date: endDate,
      total_hours: Number(totalHours),
      dev_status: devStatus.trim() || undefined,
      status,
      priority: priority as ProjectDto['priority'],
      business_unit_id: businessUnitId || null,
      budget: budget !== '' ? Number(budget) : null,
      budget_currency: budgetCurrency,
      owner_id: projectOwners[0]?.id || '',

      leader_id: teamLeaders[0]?.id || undefined,
      members: teamMembers.map(m => ({ user_id: m.id, role: m.role || 'MEMBER', allocation_percent: m.allocation_percent ?? 100 })),

      ...(clientTouched ? { client_id: clientId || null } : {}),
      bidder_id: bidder?.id || null,
      source: source.trim() || null,
      commission_type: hasCommissionType ? (commissionType as 'PERCENTAGE' | 'FIXED') : null,
      commission_value: hasCommissionValue ? Number(commissionValue) : null,
      commission_status: commissionStatus || null,
    };

    try {
      if (isEdit && project) {
        await updateMutation.mutateAsync({ id: project.id, data: payload });
        toast.success('Project updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Project created successfully');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save project');
    }
  };

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all bg-white';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[140]"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-full md:w-[540px] bg-[#F7F8FC] shadow-2xl z-[141] flex flex-col overflow-hidden md:rounded-l-[3rem]"
          >
            <div className="px-8 pt-8 pb-2 shrink-0 flex items-center justify-between">
              <IconButton
                icon={ArrowRight}
                variant="secondary"
                size="lg"
                aria-label="Close panel"
                onClick={onClose}
                className="!h-10 !w-10 bg-white border border-gray-100 shadow-sm text-gray-700"
              />
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {isEdit ? 'Edit Project' : 'New Project'}
              </h2>
              <div className="w-10 h-10" />
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-8 no-scrollbar">
              <div className="flex flex-col gap-6">
                <Input
                  label="Project Name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  error={errors.projectName}
                  placeholder="Enter project name"
                  className="h-12 rounded-xl"
                />

                <Textarea
                  label="Project Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter project description"
                  rows={4}
                  className="min-h-[140px]"
                />

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Client</label>
                  <SearchableSelect
                    options={(() => {
                      const opts = clientResults.map((c) => ({ label: c.company ? `${c.name} (${c.company})` : c.name, value: c.id }));

                      if (clientId && !opts.some((o) => String(o.value) === clientId)) {
                        opts.unshift({ label: clientDisplayName || clientId, value: clientId });
                      }
                      return opts;
                    })()}
                    value={clientId || null}
                    onChange={(v) => { setClientTouched(true); setClientId(v ? String(v) : ''); }}
                    onSearch={setClientSearch}
                    loading={clientsLoading}
                    placeholder="Search clients…"
                    searchPlaceholder="Search by name or company…"
                    emptyMessage="No clients found"
                  />
                  {!clientId && !clientTouched && clientName && (
                    <span className="text-[11px] text-gray-400 font-medium ml-1">
                      Legacy client on file (not linked): "{clientName}" — pick a client above to link it
                    </span>
                  )}
                </div>

                <Input
                  label="Dev Status"
                  value={devStatus}
                  onChange={(e) => setDevStatus(e.target.value)}
                  placeholder="e.g. Waiting on client feedback"
                  className="h-12 rounded-xl"
                />

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Status</label>
                  <SearchableSelect
                    options={PROJECT_STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                    value={status}
                    onChange={(v) => setStatus(String(v))}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Priority</label>
                  <SearchableSelect
                    options={[
                      { label: 'Low', value: 'LOW' },
                      { label: 'Medium', value: 'MEDIUM' },
                      { label: 'High', value: 'HIGH' },
                      { label: 'Critical', value: 'CRITICAL' },
                    ]}
                    value={priority}
                    onChange={(v) => setPriority(String(v))}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Business Unit</label>
                  <SearchableSelect
                    options={[{ label: 'Unassigned', value: '' }, ...businessUnits.map((bu: any) => ({ label: bu.name, value: bu.id }))]}
                    value={businessUnitId}
                    onChange={(v) => setBusinessUnitId(String(v))}
                  />
                </div>

                {isEdit && project?.project_code && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Project Code</span>
                    <span className="text-sm font-bold text-gray-600 ml-1">{project.project_code}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-base font-black text-gray-900 tracking-tight">Commercial</h3>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-gray-600 ml-1">Bidder</label>
                  {bidder ? (
                    <div className="flex items-center justify-between gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={bidder.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(bidder.name)}&background=random`}
                          className="w-7 h-7 rounded-full object-cover"
                          alt={bidder.name}
                        />
                        <span className="text-[13px] font-bold text-gray-700">{bidder.name}</span>
                      </div>
                      <IconButton
                        icon={X}
                        variant="ghost"
                        size="sm"
                        aria-label="Remove bidder"
                        onClick={() => setBidder(null)}
                        className="!h-auto !w-auto p-1 text-gray-400 hover:text-red-400"
                      />
                    </div>
                  ) : (
                    <SearchableSelect
                      options={bidderUsers.map((u: any) => ({ label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email, value: u.id }))}
                      value={null}
                      onChange={(v) => {
                        const u = bidderUsers.find((x: any) => x.id === v);
                        if (u) setBidder({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim(), avatar: u.avatar || '' });
                      }}
                      onSearch={setBidderSearch}
                      loading={biddersLoading}
                      placeholder="Search employees…"
                      searchPlaceholder="Search by name, email, department…"
                      emptyMessage="No employees found"
                    />
                  )}
                  <span className="text-[11px] text-gray-400 font-medium ml-1">The employee who bid/won this work — distinct from Project Owner and Team Leader.</span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Source / Platform</label>
                  <SearchableSelect
                    options={[
                      { label: 'TekXAI', value: 'TekXAI' },
                      { label: 'Upwork', value: 'Upwork' },
                      { label: 'LinkedIn', value: 'LinkedIn' },
                      { label: 'Website', value: 'Website' },
                      { label: 'Referral', value: 'Referral' },
                      { label: 'Other', value: 'Other' },

                      ...(source && !['TekXAI', 'Upwork', 'LinkedIn', 'Website', 'Referral', 'Other'].includes(source)
                        ? [{ label: source, value: source }] : []),
                    ]}
                    value={source || null}
                    onChange={(v) => setSource(v ? String(v) : '')}
                    placeholder="Select or clear"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Commission Type</label>
                    <SearchableSelect
                      options={[{ label: 'Percentage', value: 'PERCENTAGE' }, { label: 'Fixed Amount', value: 'FIXED' }]}
                      value={commissionType || null}
                      onChange={(v) => setCommissionType((v as 'PERCENTAGE' | 'FIXED') || '')}
                      placeholder="No commission"
                    />
                  </div>
                  <Input
                    label={commissionType === 'PERCENTAGE' ? 'Commission (%)' : `Commission (${budgetCurrency})`}
                    type="number"

                    step="0.01"
                    value={commissionValue}
                    onChange={(e) => setCommissionValue(e.target.value)}
                    disabled={!commissionType}
                    placeholder={commissionType ? '0.00' : '—'}
                    className="h-12 rounded-xl"
                  />
                </div>
                {errors.commission && <span className="text-xs text-red-500 font-semibold ml-1">{errors.commission}</span>}

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Commission Status</label>
                  <SearchableSelect
                    options={[
                      { label: 'Full Project Commission Paid', value: 'FULL_PROJECT_PAID' },
                      { label: 'Commission Paid for Completed Milestones', value: 'MILESTONES_PAID' },
                      { label: 'Commission Pending', value: 'PENDING' },
                    ]}
                    value={commissionStatus || null}
                    onChange={(v) => setCommissionStatus((v as typeof commissionStatus) || '')}
                    placeholder="Not tracked"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4" id="field-startDate">
                <h3 className="text-base font-black text-gray-900 tracking-tight">Project Parameters</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={setStartDate}
                    error={errors.startDate}
                  />
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={setEndDate}
                    error={errors.endDate}
                  />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Estimated Hours</label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={totalHours}
                      onChange={(e) => setTotalHours(e.target.value)}
                      className={cn(inputClass, 'pl-11')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Input
                    label="Budget"
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    error={errors.budget}
                    placeholder="0.00"
                    className="h-12 rounded-xl"
                  />
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Currency</label>
                    <SearchableSelect
                      options={[
                        { label: 'PKR', value: 'PKR' },
                        { label: 'USD', value: 'USD' },
                        { label: 'EUR', value: 'EUR' },
                        { label: 'GBP', value: 'GBP' },
                      ]}
                      value={budgetCurrency}
                      onChange={(v) => setBudgetCurrency(String(v))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <h3 className="text-base font-black text-gray-900 tracking-tight">Team Assignment</h3>

                <div className="flex flex-col gap-3" id="field-owner">
                  <label className="text-[13px] font-bold text-gray-600 ml-1">
                    Project Owners *
                    {errors.owner && <span className="text-red-500 ml-2 font-medium text-xs">({errors.owner})</span>}
                  </label>
                  <div className={cn(
                    "flex flex-wrap gap-2 items-center min-h-[44px] p-3 rounded-2xl border border-dashed transition-all bg-gray-50/50",
                    errors.owner ? "border-red-500 bg-red-50/10" : "border-gray-200"
                  )}>
                    <AnimatePresence>
                      {projectOwners.map((m) => (
                        <AvatarChip key={m.id} member={m} onRemove={() => setProjectOwners(prev => prev.filter(p => p.id !== m.id))} />
                      ))}
                    </AnimatePresence>
                    <UserSelectDropdown
                      onSelect={(u) => setProjectOwners(prev => [...prev, u])}
                      excludeIds={projectOwners.map(p => p.id)}
                      placeholder="Add owner"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[13px] font-bold text-gray-600 ml-1">Team Leaders</label>
                  <div className="flex flex-wrap gap-2 items-center min-h-[44px] p-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                    <AnimatePresence>
                      {teamLeaders.map((m) => (
                        <AvatarChip key={m.id} member={m} onRemove={() => setTeamLeaders(prev => prev.filter(p => p.id !== m.id))} />
                      ))}
                    </AnimatePresence>
                    <UserSelectDropdown
                      onSelect={(u) => setTeamLeaders(prev => [...prev, u])}
                      excludeIds={teamLeaders.map(p => p.id)}
                      placeholder="Add leader"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[13px] font-bold text-gray-600 ml-1">Team Members</label>
                  <div className="flex flex-wrap gap-2 items-center min-h-[44px] p-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                    <AnimatePresence>
                      {teamMembers.map((m) => (
                        <MemberRoleRow
                          key={m.id}
                          member={m}
                          onRoleChange={(role) => setTeamMembers(prev => prev.map(p => p.id === m.id ? { ...p, role } : p))}
                          onAllocationChange={(allocation_percent) => setTeamMembers(prev => prev.map(p => p.id === m.id ? { ...p, allocation_percent } : p))}
                          onRemove={() => setTeamMembers(prev => prev.filter(p => p.id !== m.id))}
                        />
                      ))}
                    </AnimatePresence>
                    <UserSelectDropdown
                      onSelect={(u) => setTeamMembers(prev => [...prev, { ...u, role: 'MEMBER', allocation_percent: 100 }])}
                      excludeIds={teamMembers.map(p => p.id)}
                      placeholder="Add member"
                    />
                  </div>
                </div>
              </div>

              {isEdit && project && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <ListChecks size={18} className="text-[#005CDA]" />
                      Milestones
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl text-xs font-black px-3"
                      onClick={() => setShowCreateMilestone(true)}
                    >
                      <Plus size={14} className="mr-1" />
                      Add Milestone
                    </Button>
                  </div>

                  {milestonesLoading && (
                    <div className="flex items-center justify-center py-6 text-gray-400">
                      <Loader2 size={18} className="animate-spin" />
                    </div>
                  )}

                  {!milestonesLoading && activeMilestones.length === 0 && (
                    <div className="text-sm text-gray-400 font-medium py-4 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                      No milestones yet for this project.
                    </div>
                  )}

                  {!milestonesLoading && activeMilestones.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {activeMilestones.map((milestone, idx) => (
                        <div
                          key={milestone.id}
                          className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3"
                        >
                          <div className="flex flex-col shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0 || reorderMilestonesMutation.isPending}
                              onClick={() => moveMilestone(milestone.id, -1)}
                              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Move milestone up"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === activeMilestones.length - 1 || reorderMilestonesMutation.isPending}
                              onClick={() => moveMilestone(milestone.id, 1)}
                              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label="Move milestone down"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>

                          <CheckCircle2
                            size={16}
                            className={cn('shrink-0', milestone.status === 'COMPLETED' ? 'text-[#005CDA]' : 'text-gray-300')}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-sm truncate">{milestone.title}</span>
                              <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0', MILESTONE_STATUS_STYLE[milestone.status] || MILESTONE_STATUS_STYLE.NOT_STARTED)}>
                                {milestone.status.replace(/_/g, ' ')}
                              </span>
                              <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0', milestone.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600')}>
                                {milestone.payment_status === 'PAID' ? 'Paid' : 'Unpaid'}
                              </span>
                            </div>
                            {milestone.due_date && (
                              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                                Due {new Date(milestone.due_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>

                          <span className="text-sm font-black text-gray-700 tabular-nums shrink-0">
                            {budgetCurrency} {Number(milestone.price || 0).toLocaleString()}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            <IconButton
                              icon={Pencil}
                              aria-label={`Edit ${milestone.title}`}
                              onClick={() => setEditingMilestone(milestone)}
                              className="text-gray-400 hover:text-[#005CDA]"
                            />
                            <IconButton
                              icon={Trash2}
                              aria-label={`Delete ${milestone.title}`}
                              disabled={milestone.payment_status === 'PAID'}
                              title={milestone.payment_status === 'PAID' ? 'Paid milestones cannot be deleted — archive it instead from Project Detail' : undefined}
                              onClick={() => {
                                if (milestone.payment_status === 'PAID') {
                                  toast.error('Paid milestones cannot be deleted — archive it instead from Project Detail.');
                                  return;
                                }
                                setMilestoneToDelete({ id: milestone.id, title: milestone.title });
                              }}
                              className="text-gray-400 hover:text-red-500 disabled:hover:text-gray-400"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="h-4" />
            </div>

            {isEdit && project && (
              <>
                <CreateMilestoneModal
                  isOpen={showCreateMilestone || !!editingMilestone}
                  onClose={() => { setShowCreateMilestone(false); setEditingMilestone(null); }}
                  projectId={project.id}
                  milestone={editingMilestone}
                  projectMembers={project.members}
                  currency={budgetCurrency}
                />
                <ActionModal
                  isOpen={!!milestoneToDelete}
                  onClose={() => setMilestoneToDelete(null)}
                  onConfirm={handleConfirmDeleteMilestone}
                  title="Delete Milestone"
                  description={`Are you sure you want to delete "${milestoneToDelete?.title}"? This action cannot be undone.`}
                  confirmText="Delete Milestone"
                  loading={deleteMilestoneMutation.isPending}
                  icon="delete"
                />
              </>
            )}

            <div className="px-8 py-6 bg-white border-t border-gray-100 shrink-0">
              <Button
                className="w-full bg-[#005CDA] hover:bg-[#0048B8] active:scale-[0.98] text-white font-black text-[15px] py-4 rounded-2xl transition-all shadow-lg shadow-primary-200 h-14"
                onClick={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEdit ? 'Save Changes' : 'Create Project'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateProjectSlideOver;
