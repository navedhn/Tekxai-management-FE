import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, CheckCircle2, Circle, MessageSquare, Plus, Trash2, ArrowRight as ArrowRightIcon, ArrowLeft, Calendar as CalendarIcon, Clock, LayoutDashboard, ListChecks, KanbanSquare, FileText, Activity as ActivityIcon, MessagesSquare, Server, Link2, Users, Wallet, Settings as SettingsIcon, GripVertical, List, GanttChartSquare } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useMyPermissions } from '@/services/permissionsService';
import Badge from './Badge';
import Button from './Button';
import SearchableSelect from './SearchableSelect';
import RequestExtensionModal from './RequestExtensionModal';
import CreateMilestoneModal from '../modals/CreateMilestoneModal';
import AddTaskModal from '../modals/AddTaskModal';
import DevopsAccessPanel from './DevopsAccessPanel';
import ClientCommunicationPanel from './ClientCommunicationPanel';
import ProjectDocumentsPanel from './ProjectDocumentsPanel';
import CommunicationTimeline from './CommunicationTimeline';
import BudgetPanel from './BudgetPanel';
import MilestoneFinancialSummary from './MilestoneFinancialSummary';
import ExtensionRequestsPanel from './ExtensionRequestsPanel';
import ProjectKanbanPanel from './ProjectKanbanPanel';
import DependenciesPanel from './DependenciesPanel';
import ResourceAllocationPanel from './ResourceAllocationPanel';
import ProjectCalendarPanel from './ProjectCalendarPanel';
import ActionModal from './ActionModal';
import StatusDropdown from './StatusDropdown';
import { useGetProjectDetails, useUpdateProjectMutation, useUpdateBudgetMutation } from '@/services/projectService';
import { useMilestones, useDeleteMilestone, useArchiveMilestone, useReorderMilestones, useUpdateMilestone, Milestone, MilestoneStatus } from '@/services/milestonesService';
import MilestoneBoardView from './MilestoneBoardView';
import MilestoneTimelineView from './MilestoneTimelineView';
import { useUpdateTask, useDeleteTask } from '@/services/tasksService';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useAuth } from '@/hooks/useAuth';
import { PROJECT_STATUS_OPTIONS, getProjectStatusStyle, getProjectStatusLabel } from '@/utils/projectStatus';
import Loader from './Loader';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  routePrefix?: string;
}

type WorkspaceTab =
  | 'overview' | 'tasks' | 'milestones' | 'calendar' | 'files' | 'activity'
  | 'communication' | 'infrastructure' | 'dependencies' | 'team' | 'financial' | 'settings';

const WORKSPACE_TABS: { id: WorkspaceTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: KanbanSquare },
  { id: 'milestones', label: 'Milestones', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'activity', label: 'Activity', icon: ActivityIcon },
  { id: 'communication', label: 'Client Communication', icon: MessagesSquare },
  { id: 'infrastructure', label: 'Infrastructure', icon: Server },
  { id: 'dependencies', label: 'Dependencies', icon: Link2 },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'financial', label: 'Financial', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const ProjectDetailsSlideOver: React.FC<SlideOverProps> = ({ isOpen, onClose, projectId, routePrefix = '/admin' }) => {
  const navigate = useNavigate();
  const toast = useToastContext();
  const { user } = useAuth();
  const { data: project, isLoading } = useGetProjectDetails(projectId);
  const { data: milestones = [], isLoading: milestonesLoading } = useMilestones(projectId);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const deleteMilestoneMutation = useDeleteMilestone(projectId);
  const archiveMilestoneMutation = useArchiveMilestone(projectId);
  const reorderMilestonesMutation = useReorderMilestones(projectId);
  const updateMilestoneMutation = useUpdateMilestone(projectId);
  const [milestoneView, setMilestoneView] = useState<'list' | 'board' | 'timeline'>('list');
  const [dragMilestoneId, setDragMilestoneId] = useState<string | null>(null);
  const [dragOverMilestoneId, setDragOverMilestoneId] = useState<string | null>(null);
  const updateTaskMutation = useUpdateTask(projectId);
  const deleteTaskMutation = useDeleteTask(projectId);
  const updateProjectMutation = useUpdateProjectMutation();

  const projectOwnerId = project?.owner_id ? String(project.owner_id) : project?.owner?.id;
  const projectLeaderId = project?.leader_id ? String(project.leader_id) : project?.team_leader?.id;
  const { data: myPerms } = useMyPermissions();
  const canEditProject = !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('erp.projects.edit') || user?.id === projectOwnerId || user?.id === projectLeaderId;
  const [showRequestModel, setShowRequestModael] = useState(false);
  const [showCreateMilestone, setShowCreateMilestone] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(false);
  const [currencyDraft, setCurrencyDraft] = useState('PKR');
  const updateBudgetForCurrency = useUpdateBudgetMutation();
  const [showAddTask, setShowAddTask] = useState(false);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | number | null>(null);
  const [milestoneToDelete, setMilestoneToDelete] = useState<{ id: string; title: string } | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleToggleTask = (taskId: string, currentStatus: string) => {
    updateTaskMutation.mutate(
      { taskId, updates: { status: currentStatus === 'DONE' ? 'TODO' : 'DONE' } },
      { onError: (e: any) => toast.error(e?.message || 'Failed to update task') }
    );
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId, {
      onSuccess: () => toast.success('Task deleted'),
      onError: (e: any) => toast.error(e?.message || 'Failed to delete task'),
    });
  };

  const handleConfirmDeleteMilestone = () => {
    if (!milestoneToDelete) return;
    deleteMilestoneMutation.mutate(milestoneToDelete.id, {
      onSuccess: () => { toast.success('Milestone deleted'); setMilestoneToDelete(null); },
      onError: (e: any) => { toast.error(e?.message || 'Failed to delete milestone'); setMilestoneToDelete(null); },
    });
  };

  const handleArchiveMilestone = (milestoneId: string) => {
    archiveMilestoneMutation.mutate(milestoneId, {
      onSuccess: () => toast.success('Milestone archived'),
      onError: (e: any) => toast.error(e?.message || 'Failed to archive milestone'),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130]"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full md:w-[90%] xl:w-[80%] max-w-[1400px] h-full bg-white shadow-2xl z-[141] flex flex-col md:rounded-l-[3rem] overflow-hidden"
          >

            <div className="flex items-center gap-3 p-6 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700 bg-gray-50 active:scale-95">
                <ArrowLeft className="rotate-180" size={20} strokeWidth={2.5} />
              </button>

            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center bg-[#FCFDFE]">
                <Loader size={48} />
              </div>
            ) : project ? (
              <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto no-scrollbar relative bg-[#FCFDFE]">

                <div className="flex-1 flex flex-col p-8 gap-10 lg:border-r border-gray-100">
                  <div>
                    <Badge variant="info" className="mb-2 bg-blue-50 text-blue-600 border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Project Scope</Badge>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">{project.title}</h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Team</span>
                      <div className="flex -space-x-2">
                        {(project.all_members || project.members || []).slice(0, 5).map((m: any, i: number) => (
                          <div key={i} className="h-9 w-9 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white shadow-sm ring-1 ring-blue-100 overflow-hidden bg-gray-100">
                            {m.avatar ? (
                              <img src={m.avatar} alt={m.first_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 uppercase">
                                {m.first_name?.charAt(0) || 'U'}
                              </div>
                            )}
                          </div>
                        ))}
                        {(project.all_members?.length || project.member_count || 0) > 5 && (
                          <div className="h-9 w-9 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[11px] font-bold text-gray-500 shadow-sm">
                            +{(project.all_members?.length || project.member_count) - 5}
                          </div>
                        )}
                        {(!(project.all_members || project.members) || (project.all_members || project.members).length === 0) && <span className="text-xs text-gray-400 font-bold italic">No members</span>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">End Date</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-black font-bold bg-white border border-gray-100 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
                          <CalendarIcon size={14} className="text-gray-400" />
                          {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}
                        </span>
                        {project.is_overdue ? (
                          <Badge variant="warning" className="bg-[#FFEB3B] text-yellow-900 border-none font-bold shadow-sm">Overdue</Badge>
                        ) : typeof project.days_remaining === 'number' && project.days_remaining >= 0 ? (
                          <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{project.days_remaining}d left</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Estimated</span>
                      <div className="flex items-center">
                        <span className="text-sm font-bold bg-white border border-gray-100 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2 text-gray-700">
                          <Clock size={14} className="text-gray-400" /> {project.total_hours} Hours
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</span>
                      {canEditProject ? (
                        <StatusDropdown
                          value={project.status || 'PENDING'}
                          options={PROJECT_STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value, colorClassName: o.className }))}
                          onChange={(v) => updateProjectMutation.mutate(
                            { id: project.id, data: { status: v as string } },
                            { onError: (e: any) => toast.error(e?.message || 'Failed to update status') }
                          )}
                        />
                      ) : (
                        <Badge variant="info" className={cn("px-4 py-2 font-black text-xs rounded-xl tracking-wide border w-fit", getProjectStatusStyle(project.status))}>
                          {getProjectStatusLabel(project.status)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-gray-100 -mb-2">
                    {WORKSPACE_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'flex items-center gap-2 px-4 h-11 rounded-t-xl text-[13px] font-black whitespace-nowrap transition-all border-b-2 -mb-px',
                          activeTab === tab.id
                            ? 'border-[#005CDA] text-[#005CDA] bg-blue-50/40'
                            : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        <tab.icon size={15} strokeWidth={2.5} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {showRequestModel && projectId && (
                    <RequestExtensionModal
                      projectId={projectId}
                      projectName={project?.title || ''}
                      currentDeadline={project?.end_date}
                      onClose={() => setShowRequestModael(false)}
                    />
                  )}
                  <CreateMilestoneModal
                    isOpen={showCreateMilestone || !!editingMilestone}
                    onClose={() => { setShowCreateMilestone(false); setEditingMilestone(null); }}
                    projectId={projectId}
                    milestone={editingMilestone}
                    projectMembers={project?.all_members || project?.members || []}
                    currency={project?.budget_currency || 'PKR'}
                  />
                  <AddTaskModal
                    isOpen={showAddTask}
                    onClose={() => setShowAddTask(false)}
                    projectId={projectId}
                    milestoneId={activeMilestoneId}
                    members={project?.all_members || project?.members || []}
                  />
                  <ActionModal
                    isOpen={!!milestoneToDelete}
                    onClose={() => setMilestoneToDelete(null)}
                    onConfirm={handleConfirmDeleteMilestone}
                    title="Delete Milestone"
                    description={`Are you sure you want to delete "${milestoneToDelete?.title}"? This will not delete its tasks.`}
                    confirmText="Delete Milestone"
                    loading={deleteMilestoneMutation.isPending}
                    icon="delete"
                  />

                  {activeTab === 'overview' && (
                    <div className="flex flex-col gap-10 w-full">

                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-gray-900 font-black">
                          <Users size={18} strokeWidth={3} className="text-primary-500" />
                          <span>Commercial</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="rounded-2xl border border-gray-100 bg-white p-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Client</p>
                            <p className="text-sm font-bold text-gray-900">{project.client?.name || project.client_name || <span className="text-gray-400 italic font-medium">Not set</span>}</p>
                            {project.client_id && <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Linked record</p>}
                          </div>
                          <div className="rounded-2xl border border-gray-100 bg-white p-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bidder</p>
                            <p className="text-sm font-bold text-gray-900">
                              {project.bidder ? `${project.bidder.first_name || ''} ${project.bidder.last_name || ''}`.trim() : <span className="text-gray-400 italic font-medium">Not set</span>}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-gray-100 bg-white p-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Source / Platform</p>
                            <p className="text-sm font-bold text-gray-900">{project.source || <span className="text-gray-400 italic font-medium">Not set</span>}</p>
                          </div>
                          <div className="rounded-2xl border border-gray-100 bg-white p-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Commission</p>
                            <p className="text-sm font-bold text-gray-900">
                              {project.commission_type && project.commission_value != null
                                ? (project.commission_type === 'PERCENTAGE' ? `${project.commission_value}%` : `${project.budget_currency || 'PKR'} ${project.commission_value.toLocaleString()}`)
                                : <span className="text-gray-400 italic font-medium">None</span>}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-gray-900 font-black">
                          <MessageSquare size={18} strokeWidth={3} className="text-primary-500" />
                          <span>Project Description</span>
                        </div>
                        <div className="p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm tracking-tight text-gray-600 font-medium leading-relaxed text-[15px]">
                          {project.description || 'No description provided for this project.'}
                        </div>
                      </div>

                      {(() => {
                        const members: any[] = project.all_members || project.members || [];
                        if (members.length === 0) return null;
                        const grouped = members.reduce((acc: Record<string, any[]>, m) => {
                          const role = m.role || 'MEMBER';
                          (acc[role] = acc[role] || []).push(m);
                          return acc;
                        }, {});
                        return (
                          <div className="flex flex-col gap-4 w-full">
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Team Summary</h3>
                            <div className="flex flex-wrap gap-3">
                              {Object.entries(grouped).map(([role, list]) => (
                                <div key={role} className="px-4 py-2 rounded-xl bg-white border border-gray-100 text-xs font-bold text-gray-600">
                                  {list.length} {role.replace('_', ' ')}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {projectId && <ExtensionRequestsPanel projectId={projectId} canReview={canEditProject} />}
                    </div>
                  )}

                  {activeTab === 'milestones' && (
                  <div className="flex flex-col gap-6 w-full">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">Project Milestones</h3>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
                          {([
                            { id: 'list', label: 'List', icon: List },
                            { id: 'board', label: 'Board', icon: KanbanSquare },
                            { id: 'timeline', label: 'Timeline', icon: GanttChartSquare },
                          ] as const).map((v) => (
                            <button
                              key={v.id}
                              onClick={() => setMilestoneView(v.id)}
                              className={cn(
                                'flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-black transition-colors',
                                milestoneView === v.id ? 'bg-white text-[#005CDA] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                              )}
                            >
                              <v.icon size={13} />
                              {v.label}
                            </button>
                          ))}
                        </div>
                        <Button
                          leftIcon={Plus}
                          onClick={() => setShowCreateMilestone(true)}
                          className="bg-[#005CDA11] hover:bg-[#005CDA22] border-none font-black text-[11px] h-9 rounded-xl py-0 px-4"
                        >
                          Create Milestone
                        </Button>
                      </div>
                    </div>

                    {milestonesLoading && (
                      <div className="flex items-center justify-center p-10">
                        <Loader size={32} />
                      </div>
                    )}

                    {!milestonesLoading && milestones.length === 0 && (
                      <div className="bg-white border border-gray-100 rounded-[2rem] p-10 text-center text-gray-400 font-semibold text-sm">
                        No milestones yet for this project.
                      </div>
                    )}

                    {!milestonesLoading && milestones.length > 0 && milestoneView === 'board' && (
                      <MilestoneBoardView
                        milestones={milestones}
                        currency={project?.budget_currency || 'PKR'}
                        canEdit={canEditProject}
                        onChangeStatus={(milestoneId, status) => {
                          updateMilestoneMutation.mutate({ milestoneId, updates: { status } }, {
                            onError: (err: any) => toast.error(err?.message || 'Failed to update milestone status'),
                          });
                        }}
                        onOpenMilestone={(m) => { setMilestoneView('list'); toggleExpand(m.id); }}
                      />
                    )}

                    {!milestonesLoading && milestones.length > 0 && milestoneView === 'timeline' && (
                      <MilestoneTimelineView
                        milestones={milestones}
                        onOpenMilestone={(m) => { setMilestoneView('list'); toggleExpand(m.id); }}
                      />
                    )}

                    {milestoneView === 'list' && milestones.map((milestone) => {
                      const tasks = milestone.tasks || [];
                      const totalTasks = tasks.length;
                      const doneTasks = tasks.filter((t) => t.status === 'DONE').length;
                      const pct = milestone.progress_percent ?? 0;
                      const members = (milestone.members || []).map((m) => m.user);
                      const STATUS_STYLE: Record<string, string> = {
                        NOT_STARTED: 'bg-gray-100 text-gray-500',
                        IN_PROGRESS: 'bg-blue-50 text-blue-600',
                        COMPLETED: 'bg-green-50 text-green-700',
                        BLOCKED: 'bg-red-50 text-red-600',
                      };
                      const daysUntilDue = milestone.due_date ? Math.ceil((new Date(milestone.due_date).getTime() - Date.now()) / 86400000) : null;
                      const milestoneHealth = milestone.status === 'COMPLETED' ? 'HEALTHY'
                        : milestone.status === 'BLOCKED' ? 'CRITICAL'
                        : daysUntilDue !== null && daysUntilDue < 0 ? 'WARNING'
                        : daysUntilDue !== null && daysUntilDue <= 3 ? 'AT_RISK'
                        : 'HEALTHY';
                      const HEALTH_DOT: Record<string, string> = {
                        HEALTHY: 'bg-emerald-500', AT_RISK: 'bg-yellow-400', WARNING: 'bg-orange-500', CRITICAL: 'bg-red-500',
                      };
                      return (
                      <div
                        key={milestone.id}
                        draggable={!milestone.archived_at}
                        onDragStart={() => setDragMilestoneId(milestone.id)}
                        onDragEnter={() => { if (!milestone.archived_at) setDragOverMilestoneId(milestone.id); }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={() => { setDragMilestoneId(null); setDragOverMilestoneId(null); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!dragMilestoneId || dragMilestoneId === milestone.id) return;
                          const activeOrder = milestones.filter((m) => !m.archived_at);
                          const fromIdx = activeOrder.findIndex((m) => m.id === dragMilestoneId);
                          const toIdx = activeOrder.findIndex((m) => m.id === milestone.id);
                          if (fromIdx === -1 || toIdx === -1) return;
                          const next = [...activeOrder];
                          const [moved] = next.splice(fromIdx, 1);
                          next.splice(toIdx, 0, moved);
                          reorderMilestonesMutation.mutate(next.map((m) => m.id), {
                            onError: (err: any) => toast.error(err?.message || 'Failed to reorder milestones'),
                          });
                          setDragMilestoneId(null);
                          setDragOverMilestoneId(null);
                        }}
                        className={cn(
                          'flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden transition-shadow',
                          dragOverMilestoneId === milestone.id && dragMilestoneId !== milestone.id && 'ring-2 ring-[#005CDA] ring-offset-2',
                          dragMilestoneId === milestone.id && 'opacity-50'
                        )}
                      >
                        <button
                          onClick={() => toggleExpand(milestone.id)}
                          className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors border-b border-transparent data-[expanded=true]:border-gray-100"
                          data-expanded={expanded[milestone.id]}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {!milestone.archived_at && (
                              <span
                                className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0"
                                title="Drag to reorder"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical size={16} />
                              </span>
                            )}
                            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', HEALTH_DOT[milestoneHealth])} title={`Health: ${milestoneHealth.replace('_', ' ')}`} />
                            <CheckCircle2 size={18} strokeWidth={2.5} className={milestone.status === 'COMPLETED' ? "text-[#005CDA]" : "text-gray-300"} />
                            {milestone.sequence != null && (
                              <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-md shrink-0">#{milestone.sequence}</span>
                            )}
                            <h3 className="font-black text-gray-900 tracking-tight text-[15px] truncate">{milestone.title}</h3>
                            <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0', STATUS_STYLE[milestone.status] || STATUS_STYLE.NOT_STARTED)}>
                              {milestone.status.replace(/_/g, ' ')}
                            </span>

                            <span className={cn(
                              'text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0',
                              milestone.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'
                            )}>
                              {milestone.payment_status === 'PAID' ? 'Paid' : 'Unpaid'}
                            </span>

                            {milestone.delivery && (
                              <span className={cn(
                                'text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0',
                                milestone.delivery.status === 'ON_TIME' ? 'bg-emerald-50 text-emerald-700'
                                  : milestone.delivery.status === 'MISSED' ? 'bg-red-50 text-red-600'
                                  : 'bg-gray-100 text-gray-500'
                              )}>
                                {milestone.delivery.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            {milestone.price > 0 && (
                              <span className="text-[12px] font-black text-gray-700 whitespace-nowrap">
                                {(project?.budget_currency || 'PKR')} {milestone.price.toLocaleString()}
                              </span>
                            )}
                            {members.length > 0 && (
                              <div className="flex items-center -space-x-2">
                                {members.slice(0, 3).map((u) => (
                                  <div key={u.id} title={`${u.first_name || ''} ${u.last_name || ''}`.trim()} className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-[9px] font-black flex items-center justify-center border-2 border-white">
                                    {(u.first_name?.[0] || '') + (u.last_name?.[0] || '')}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-3 w-40">
                              <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#005CDA] rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">{pct}%</span>
                            </div>
                            <ChevronDown size={20} className={cn("text-gray-400 transition-transform duration-300", expanded[milestone.id] && "rotate-180")} />
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {expanded[milestone.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="flex flex-col p-4 overflow-hidden bg-white"
                            >
                              {(milestone.due_date || milestone.estimated_start || milestone.estimated_end || milestone.remarks || totalTasks > 0 || (milestone.depends_on?.length ?? 0) > 0) && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-3 pb-4 text-xs">
                                  {totalTasks > 0 && (
                                    <div><p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Tasks</p><p className="font-semibold text-gray-700">{doneTasks}/{totalTasks} Done</p></div>
                                  )}
                                  {milestone.estimated_start && (
                                    <div><p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Est. Start</p><p className="font-semibold text-gray-700">{new Date(milestone.estimated_start).toLocaleDateString()}</p></div>
                                  )}
                                  {milestone.estimated_end && (
                                    <div><p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Est. End</p><p className="font-semibold text-gray-700">{new Date(milestone.estimated_end).toLocaleDateString()}</p></div>
                                  )}
                                  {milestone.due_date && (
                                    <div><p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Due Date</p><p className="font-semibold text-gray-700">{new Date(milestone.due_date).toLocaleDateString()}</p></div>
                                  )}
                                  {milestone.due_date && milestone.status !== 'COMPLETED' && (() => {
                                    const days = Math.ceil((new Date(milestone.due_date).getTime() - Date.now()) / 86400000);
                                    return (
                                      <div>
                                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Remaining Days</p>
                                        <p className={cn('font-semibold', days < 0 ? 'text-red-500' : 'text-gray-700')}>
                                          {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                  {milestone.completed_date && (
                                    <div><p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Completed</p><p className="font-semibold text-gray-700">{new Date(milestone.completed_date).toLocaleDateString()}</p></div>
                                  )}
                                  {milestone.depends_on && milestone.depends_on.length > 0 && (
                                    <div className="col-span-2 sm:col-span-4">
                                      <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide mb-1">Depends On</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {milestone.depends_on.map((d) => (
                                          <span key={d.id} className="bg-gray-50 text-gray-600 font-bold px-2 py-0.5 rounded-lg">{d.title}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {milestone.remarks && (
                                    <div className="col-span-2 sm:col-span-4">
                                      <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide mb-1">Remarks</p>
                                      <p className="text-gray-600 font-medium">{milestone.remarks}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {milestone.delivery && (() => {
                                const d = milestone.delivery;
                                const resources = milestone.responsible_resources || [];
                                const hasAnyEvidenceFields = d.original_deadline || d.missed_reason_category || d.issue_classification || d.qa_status || (d.rework_count != null) || d.evidence_count > 0 || resources.length > 0;
                                if (!hasAnyEvidenceFields) return null;
                                return (
                                  <div className="px-3 pb-4">
                                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide mb-2">Delivery</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50/60 rounded-2xl p-3">
                                      {resources.length > 0 && (
                                        <div className="col-span-2 sm:col-span-4">
                                          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Responsible Resource(s)</p>
                                          <p className="font-semibold text-gray-700">{resources.map((r: any) => `${r.first_name || ''} ${r.last_name || ''}`.trim()).join(', ')}</p>
                                        </div>
                                      )}
                                      {d.original_deadline && d.original_deadline !== d.deadline && (
                                        <div>
                                          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Original Deadline</p>
                                          <p className="font-semibold text-gray-700">{new Date(d.original_deadline).toLocaleDateString()}</p>
                                        </div>
                                      )}
                                      {d.missed_reason_category && (
                                        <div>
                                          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Missed Reason</p>
                                          <p className="font-semibold text-gray-700">{d.missed_reason_category.replace(/_/g, ' ')}</p>
                                        </div>
                                      )}
                                      {d.issue_classification && (
                                        <div>
                                          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Classification</p>
                                          <p className="font-semibold text-gray-700">{d.issue_classification.replace(/_/g, ' ')}</p>
                                        </div>
                                      )}
                                      {d.qa_status && (
                                        <div>
                                          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">QA Status</p>
                                          <p className={cn('font-semibold', d.qa_status === 'FAILED' ? 'text-red-600' : 'text-gray-700')}>{d.qa_status.replace(/_/g, ' ')}</p>
                                        </div>
                                      )}
                                      {d.rework_count != null && (
                                        <div>
                                          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Rework Count</p>
                                          <p className="font-semibold text-gray-700">{d.rework_count}</p>
                                        </div>
                                      )}
                                      {d.evidence_count > 0 && (
                                        <div>
                                          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Evidence</p>
                                          <p className="font-semibold text-gray-700">{d.evidence_count} document{d.evidence_count === 1 ? '' : 's'}</p>
                                        </div>
                                      )}
                                      {d.missed_reason_detail && (
                                        <div className="col-span-2 sm:col-span-4">
                                          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">Explanation</p>
                                          <p className="font-medium text-gray-600">{d.missed_reason_detail}</p>
                                        </div>
                                      )}
                                      {d.qa_notes && (
                                        <div className="col-span-2 sm:col-span-4">
                                          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wide">QA / Evidence Notes</p>
                                          <p className="font-medium text-gray-600">{d.qa_notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                              {tasks.length === 0 && (
                                <div className="px-3 py-4 text-sm text-gray-400 font-medium">No tasks in this milestone yet.</div>
                              )}
                              <AnimatePresence>
                                {tasks.map((task) => {
                                  const isDone = task.status === 'DONE';
                                  return (
                                  <motion.div
                                    key={task.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, x: -10 }}
                                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition-all"
                                  >
                                    <button
                                      onClick={() => handleToggleTask(task.id, task.status)}
                                      className="flex items-start sm:items-center gap-3 text-left"
                                    >
                                      {isDone ? (
                                        <CheckCircle2 size={24} className="text-[#005CDA] fill-[#005CDA]" color="white" />
                                      ) : (
                                        <Circle size={24} className="text-gray-200" />
                                      )}
                                      <span className={cn("text-[14px] font-bold tracking-tight", isDone ? "text-gray-400 line-through" : "text-gray-700")}>{task.title}</span>
                                    </button>

                                    <div className="flex items-center gap-4 mt-2 sm:mt-0 justify-end opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                      {task.assignee && (
                                        <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[10px] uppercase tracking-tighter bg-white border border-gray-100 px-2.5 py-1 rounded-lg">
                                          {task.assignee.first_name} {task.assignee.last_name}
                                        </div>
                                      )}
                                      <button onClick={() => handleDeleteTask(task.id)} className="h-8 w-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                        <Trash2 size={16} strokeWidth={2.5} />
                                      </button>
                                    </div>
                                  </motion.div>
                                  );
                                })}
                              </AnimatePresence>

                              <div className="flex items-center justify-between p-4 border-t border-gray-50 mt-4">
                                <Button
                                  leftIcon={Plus}
                                  onClick={() => {
                                    setActiveMilestoneId(milestone.id);
                                    setShowAddTask(true);
                                  }}
                                  className="bg-primary-50 border-none font-black h-10 px-6 rounded-xl text-xs gap-2"
                                >
                                  Add task
                                </Button>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setEditingMilestone(milestone)}
                                    className="flex items-center gap-2 text-gray-500 font-black hover:bg-gray-50 px-3 py-2 rounded-xl transition-all text-xs uppercase tracking-widest"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleArchiveMilestone(milestone.id)}
                                    disabled={archiveMilestoneMutation.isPending}
                                    className="flex items-center gap-2 text-gray-500 font-black hover:bg-gray-50 px-3 py-2 rounded-xl transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                                  >
                                    Archive
                                  </button>
                                  <button
                                    disabled={milestone.payment_status === 'PAID'}
                                    title={milestone.payment_status === 'PAID' ? 'Paid milestones cannot be deleted — use Archive instead' : undefined}
                                    onClick={() => {
                                      if (milestone.payment_status === 'PAID') {
                                        toast.error('Paid milestones cannot be deleted — use Archive instead.');
                                        return;
                                      }
                                      setMilestoneToDelete({ id: milestone.id, title: milestone.title });
                                    }}
                                    className="flex items-center gap-2 text-red-500 font-black hover:bg-red-50 px-3 py-2 rounded-xl transition-all text-xs uppercase tracking-widest disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      );
                    })}
                  </div>
                  )}

                  {activeTab === 'tasks' && projectId && (
                    <ProjectKanbanPanel projectId={projectId} />
                  )}

                  {activeTab === 'calendar' && projectId && (
                    <ProjectCalendarPanel
                      projectId={projectId}
                      projectEndDate={project?.end_date}
                      onOpenMilestone={() => setActiveTab('milestones')}
                      onOpenTask={() => setActiveTab('tasks')}
                    />
                  )}

                  {activeTab === 'files' && projectId && (
                    <ProjectDocumentsPanel projectId={projectId} canEdit={canEditProject} />
                  )}

                  {activeTab === 'activity' && projectId && (
                    <CommunicationTimeline projectId={projectId} />
                  )}

                  {activeTab === 'communication' && projectId && (
                    <ClientCommunicationPanel projectId={projectId} canEdit={canEditProject} />
                  )}

                  {activeTab === 'infrastructure' && projectId && (
                    <DevopsAccessPanel
                      projectId={projectId}
                      ownerId={projectOwnerId}
                      leaderId={projectLeaderId}
                      accessScore={project.access_completion_score}
                      healthScore={project.health_score}
                      healthStatus={project.health_status}
                    />
                  )}

                  {activeTab === 'dependencies' && projectId && (
                    <DependenciesPanel projectId={projectId} canEdit={canEditProject} />
                  )}

                  {activeTab === 'team' && (() => {
                    const ROLE_LABELS: Record<string, string> = {
                      FRONTEND: 'Frontend Developers',
                      BACKEND: 'Backend Developers',
                      TEAM_LEAD: 'Team Lead',
                      QA: 'QA',
                      DEVOPS: 'DevOps',
                      UI_UX: 'UI/UX',
                      AI_ENGINEER: 'AI Engineers',
                      BUSINESS_ANALYST: 'Business Analysts',
                      SALES: 'Sales',
                      ESTIMATOR: 'Estimators',
                      OTHER: 'Other',
                      MEMBER: 'Members',
                    };
                    const ROLE_ORDER = ['TEAM_LEAD', 'FRONTEND', 'BACKEND', 'QA', 'DEVOPS', 'UI_UX', 'AI_ENGINEER', 'BUSINESS_ANALYST', 'SALES', 'ESTIMATOR', 'OTHER', 'MEMBER'];
                    const members: any[] = project.all_members || project.members || [];
                    if (members.length === 0) {
                      return (
                        <div className="bg-white border border-gray-100 rounded-[2rem] p-10 text-center text-gray-400 font-semibold text-sm">
                          No team members assigned to this project yet.
                        </div>
                      );
                    }
                    const grouped = members.reduce((acc: Record<string, any[]>, m) => {
                      const role = m.role || 'MEMBER';
                      (acc[role] = acc[role] || []).push(m);
                      return acc;
                    }, {});
                    const roles = ROLE_ORDER.filter((r) => grouped[r]?.length);
                    return (
                      <div className="flex flex-col gap-8 w-full">
                        {projectId && <ResourceAllocationPanel projectId={projectId} />}
                        <div className="flex flex-col gap-4 w-full">
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Team by Role</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {roles.map((role) => (
                            <div key={role} className="rounded-2xl border border-gray-100 bg-white p-4">
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{ROLE_LABELS[role] || role}</p>
                              <div className="flex flex-col gap-1.5">
                                {grouped[role].map((m: any) => (
                                  <span key={m.id} className="text-sm font-semibold text-gray-700">
                                    {`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        </div>
                      </div>
                    );
                  })()}

                  {activeTab === 'financial' && projectId && (
                    <div className="flex flex-col gap-6 w-full">
                      <MilestoneFinancialSummary
                        financial={project.financial}
                        activeMilestone={project.active_milestone}
                      />
                      <BudgetPanel
                        projectId={projectId}
                        budget={project.budget}
                        budgetCurrency={project.budget_currency}
                        budgetSpent={project.budget_spent}
                        canEdit={canEditProject}
                      />
                    </div>
                  )}

                  {activeTab === 'settings' && (
                    <div className="flex flex-col gap-4 w-full">
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">Project Settings</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Project Type</p>
                          <p className="text-sm font-bold text-gray-700">{project.project_type || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Budget Currency</p>
                          {editingCurrency ? (
                            <div className="flex items-center gap-2">
                              <SearchableSelect
                                options={[
                                  { label: 'PKR', value: 'PKR' },
                                  { label: 'USD', value: 'USD' },
                                  { label: 'CAD', value: 'CAD' },
                                  { label: 'EUR', value: 'EUR' },
                                  { label: 'GBP', value: 'GBP' },
                                ]}
                                value={currencyDraft}
                                onChange={(v) => setCurrencyDraft(String(v))}
                              />
                              <Button
                                onClick={() => {
                                  if (!projectId) return;
                                  updateBudgetForCurrency.mutate(
                                    { id: projectId, data: { budget_currency: currencyDraft } },
                                    {
                                      onSuccess: () => { toast.success('Currency updated'); setEditingCurrency(false); },
                                      onError: (e: any) => toast.error(e?.message || 'Failed to update currency'),
                                    }
                                  );
                                }}
                                disabled={updateBudgetForCurrency.isPending}
                                className="bg-primary-500 text-white h-9 rounded-xl font-bold text-xs px-3 disabled:opacity-40"
                              >
                                {updateBudgetForCurrency.isPending ? 'Saving…' : 'Save'}
                              </Button>
                              <Button
                                onClick={() => setEditingCurrency(false)}
                                className="bg-gray-100 text-gray-700 h-9 rounded-xl font-bold text-xs px-3"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-gray-700">{project.budget_currency || 'PKR'}</p>
                              {canEditProject && (
                                <button
                                  type="button"
                                  onClick={() => { setCurrencyDraft(project.budget_currency || 'PKR'); setEditingCurrency(true); }}
                                  className="text-xs font-bold text-primary-600 hover:underline"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Client Name</p>
                          <p className="text-sm font-bold text-gray-700">{project.client_name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-full lg:w-[320px] 2xl:w-[380px] bg-white p-8 flex flex-col gap-10 shrink-0">
                  <div className="flex flex-col rounded-[2rem] overflow-hidden bg-white border border-blue-50 shadow-sm">
                    <div className="bg-blue-50 px-6 py-5 font-black text-gray-900 tracking-tight text-[15px]">Project Health</div>
                    <div className="p-6 flex flex-col gap-6">
                      <div className="flex items-center gap-3 w-full">
                        <span className="text-sm font-bold text-gray-400">Total:</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#005CDA] rounded-full" style={{ width: `${project.progress || 0}%` }} />
                        </div>
                        <span className="text-xs font-black text-gray-900">{project.progress || 0}%</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Deadline Alert</span>
                        <Button onClick={() => setShowRequestModael(true)} className="flex items-center justify-center gap-3 w-full bg-[#005CDA] hover:bg-[#0048B8] text-white px-6 py-3.5 rounded-2xl font-black text-[13px] shadow-lg shadow-blue-100 active:scale-95 transition-all">
                          Request Extension <ArrowRight size={16} strokeWidth={3} />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 text-[13px] font-bold text-gray-500">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                      <span className="text-gray-400">Start Date:</span>
                      <span className="text-gray-900 font-black">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                      <span className="text-gray-400">Progress:</span>
                      <span className="text-gray-900 font-black">{project.progress || 0}% Complete</span>
                    </div>

                    <div className="flex flex-col gap-4 pb-4 border-b border-gray-50">
                      <span className="text-gray-400 uppercase tracking-widest text-[10px]">Project Owners</span>
                      <div className="flex flex-col gap-4">
                        {project.owner ? (
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-primary-600 font-black uppercase text-xs border-2 border-white shadow-sm ring-1 ring-blue-100 overflow-hidden">
                              {project.owner.avatar ? (
                                <img src={project.owner.avatar} alt={project.owner.first_name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{project.owner.first_name?.charAt(0)}{project.owner.last_name?.charAt(0)}</span>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-900 font-black text-[14px] leading-tight">{project.owner.first_name} {project.owner.last_name}</span>
                              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">{project.owner.email || 'Primary Owner'}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic font-bold">No owner assigned</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <span className="text-gray-400 uppercase tracking-widest text-[10px]">Team Leaders</span>
                      <div className="flex flex-col gap-4">
                        {project.team_leader ? (
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-black uppercase text-xs border-2 border-white shadow-sm ring-1 ring-purple-100 overflow-hidden">
                              {project.team_leader.avatar ? (
                                <img src={project.team_leader.avatar} alt={project.team_leader.first_name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{project.team_leader.first_name?.charAt(0)}{project.team_leader.last_name?.charAt(0)}</span>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-900 font-black text-[14px] leading-tight">{project.team_leader.first_name} {project.team_leader.last_name}</span>
                              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">{project.team_leader.email || 'Project Lead'}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic font-bold">No leader assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[#FCFDFE]">
                <div className="text-center">
                  <p className="text-gray-400 font-bold">Project not found.</p>
                  <button onClick={onClose} className="mt-4 text-primary-500 font-black uppercase text-xs tracking-widest hover:underline">Close Sidebar</button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProjectDetailsSlideOver;
