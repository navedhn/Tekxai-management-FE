import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {Clock, X, Plus, Search, User ,Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import DatePicker from './DatePicker';
import { ProjectDetail, ProjectDto, ProjectMemberRole, PROJECT_MEMBER_ROLES, useCreateProjectMutation, useUpdateProjectMutation } from '@/services/projectService';
import { useFetchUsersQuery } from '@/services/userService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { PROJECT_STATUS_OPTIONS } from '@/utils/projectStatus';

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role?: ProjectMemberRole;
}

interface CreateProjectSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  project?: ProjectDetail | null; // Pass project for edit mode
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
    <button onClick={onRemove} className="ml-1 text-gray-400 hover:text-red-400 transition-colors">
      <X size={13} strokeWidth={2.5} />
    </button>
  </motion.div>
);

// Team member row with a functional-role select — reuses the existing
// project_members.role column (previously always "MEMBER", never surfaced).
const MemberRoleRow: React.FC<{ member: TeamMember; onRoleChange: (role: ProjectMemberRole) => void; onRemove: () => void }> = ({ member, onRoleChange, onRemove }) => (
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
    <select
      value={member.role || 'MEMBER'}
      onChange={(e) => onRoleChange(e.target.value as ProjectMemberRole)}
      className="text-[12px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2 py-1 focus:outline-none"
    >
      {PROJECT_MEMBER_ROLES.map((r) => (
        <option key={r.value} value={r.value}>{r.label}</option>
      ))}
    </select>
    <button onClick={onRemove} className="text-gray-400 hover:text-red-400 transition-colors">
      <X size={13} strokeWidth={2.5} />
    </button>
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
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalHours, setTotalHours] = useState('0');
  const [clientName, setClientName] = useState('');
  const [devStatus, setDevStatus] = useState('');
  const [status, setStatus] = useState('PLANNING');
  const [budget, setBudget] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('PKR');

  const [projectOwners, setProjectOwners] = useState<TeamMember[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<TeamMember[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();

  const isEdit = !!project;

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
      setBudget(project.budget != null ? String(project.budget) : '');
      setBudgetCurrency(project.budget_currency || 'PKR');
      setTeamMembers((project.members || []).map((m) => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name}`.trim(),
        avatar: m.avatar || '',
        role: m.role || 'MEMBER',
      })));
      // Owner/Team Leader: normalize_project() already includes the full
      // `owner`/`team_leader` objects (id/first_name/last_name/avatar), so
      // prefill from those directly — same pattern as teamMembers above.
      // Without this, editing a project always started from an empty owner
      // list, which both blocked the required-owner validation on every edit
      // and silently overwrote owner_id with whatever was re-picked.
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
      setBudget('');
      setBudgetCurrency('PKR');
      setProjectOwners([]);
      setTeamLeaders([]);
      setTeamMembers([]);
    }
  }, [project, isOpen]);

  const handleSubmit = async () => {
    // Inline validation
    const newErrors: Record<string, string> = {};
    if (!projectName.trim()) newErrors.projectName = 'Project name is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!endDate) newErrors.endDate = 'End date is required';
    if (projectOwners.length === 0) newErrors.owner = 'At least one project owner is required';
    if (budget !== '' && Number(budget) < 0) newErrors.budget = 'Budget cannot be negative';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const payload: ProjectDto = {
      title: projectName,
      description,
      start_date: startDate,
      end_date: endDate,
      total_hours: Number(totalHours),
      client_name: clientName.trim() || undefined,
      dev_status: devStatus.trim() || undefined,
      status,
      budget: budget !== '' ? Number(budget) : null,
      budget_currency: budgetCurrency,
      owner_id: projectOwners[0]?.id || '',
      // leader_id is optional — omit it (not '') when no leader is picked, since
      // it's a foreign key and an empty string fails the DB constraint, silently
      // rolling back the whole project creation.
      leader_id: teamLeaders[0]?.id || undefined,
      members: teamMembers.map(m => ({ user_id: m.id, role: m.role || 'MEMBER' })),
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
              <button
                onClick={onClose}
                className="h-10 w-10 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
              >
                <ArrowRight size={18} strokeWidth={2.5} className="text-gray-700" />
              </button>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {isEdit ? 'Edit Project' : 'New Project'}
              </h2>
              <div className="w-10 h-10" /> {/* Spacer */}
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

                <Input
                  label="Client"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client name"
                  className="h-12 rounded-xl"
                />

                <Input
                  label="Dev Status"
                  value={devStatus}
                  onChange={(e) => setDevStatus(e.target.value)}
                  placeholder="e.g. Waiting on client feedback"
                  className="h-12 rounded-xl"
                />

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Status</label>
                  <Select
                    options={PROJECT_STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                    value={status}
                    onChange={(v) => setStatus(String(v))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
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
                    <Select
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

                {/* Project Owner */}
                <div className="flex flex-col gap-3">
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

                {/* Team Leader */}
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

                {/* Team Members — each carries a functional role (Frontend/Backend/QA/etc.) */}
                <div className="flex flex-col gap-3">
                  <label className="text-[13px] font-bold text-gray-600 ml-1">Team Members</label>
                  <div className="flex flex-wrap gap-2 items-center min-h-[44px] p-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                    <AnimatePresence>
                      {teamMembers.map((m) => (
                        <MemberRoleRow
                          key={m.id}
                          member={m}
                          onRoleChange={(role) => setTeamMembers(prev => prev.map(p => p.id === m.id ? { ...p, role } : p))}
                          onRemove={() => setTeamMembers(prev => prev.filter(p => p.id !== m.id))}
                        />
                      ))}
                    </AnimatePresence>
                    <UserSelectDropdown
                      onSelect={(u) => setTeamMembers(prev => [...prev, { ...u, role: 'MEMBER' }])}
                      excludeIds={teamMembers.map(p => p.id)}
                      placeholder="Add member"
                    />
                  </div>
                </div>
              </div>

              <div className="h-4" />
            </div>

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

