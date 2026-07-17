import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, CheckCircle2, Circle, MessageSquare, Plus, Trash2, ArrowRight as ArrowRightIcon, ArrowLeft, Calendar as CalendarIcon, Clock, LayoutDashboard, ListChecks, KanbanSquare, FileText, Activity as ActivityIcon, MessagesSquare, Server, Link2, Users, Wallet, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import Badge from './Badge';
import Button from './Button';
import RequestExtensionModal from './RequestExtensionModal';
import CreateMilestoneModal from '../modals/CreateMilestoneModal';
import AddTaskModal from '../modals/AddTaskModal';
import DevopsAccessPanel from './DevopsAccessPanel';
import ClientCommunicationPanel from './ClientCommunicationPanel';
import ProjectDocumentsPanel from './ProjectDocumentsPanel';
import CommunicationTimeline from './CommunicationTimeline';
import BudgetPanel from './BudgetPanel';
import ExtensionRequestsPanel from './ExtensionRequestsPanel';
import ProjectKanbanPanel from './ProjectKanbanPanel';
import DependenciesPanel from './DependenciesPanel';
import ActionModal from './ActionModal';
import StatusDropdown from './StatusDropdown';
import { useGetProjectDetails, useUpdateProjectMutation } from '@/services/projectService';
import { useMilestones, useDeleteMilestone } from '@/services/milestonesService';
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
  | 'overview' | 'tasks' | 'milestones' | 'files' | 'activity'
  | 'communication' | 'infrastructure' | 'dependencies' | 'team' | 'financial' | 'settings';

const WORKSPACE_TABS: { id: WorkspaceTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: KanbanSquare },
  { id: 'milestones', label: 'Milestones', icon: ListChecks },
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
  const { user, role } = useAuth();
  const { data: project, isLoading } = useGetProjectDetails(projectId);
  const { data: milestones = [], isLoading: milestonesLoading } = useMilestones(projectId);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const deleteMilestoneMutation = useDeleteMilestone(projectId);
  const updateTaskMutation = useUpdateTask(projectId);
  const deleteTaskMutation = useDeleteTask(projectId);
  const updateProjectMutation = useUpdateProjectMutation();

  const projectOwnerId = project?.owner_id ? String(project.owner_id) : project?.owner?.id;
  const projectLeaderId = project?.leader_id ? String(project.leader_id) : project?.team_leader?.id;
  const canEditProject = role === 'ADMIN' || role === 'SUPER_ADMIN' || user?.id === projectOwnerId || user?.id === projectLeaderId;
  const [showRequestModel, setShowRequestModael] = useState(false);
  const [showCreateMilestone, setShowCreateMilestone] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | number | null>(null);
  const [milestoneToDelete, setMilestoneToDelete] = useState<{ id: string; title: string } | null>(null);
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
            {/* Header Controls */}
            <div className="flex items-center gap-3 p-6 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700 bg-gray-50 active:scale-95">
                <ArrowLeft className="rotate-180" size={20} strokeWidth={2.5} />
              </button>
              {/* <button
                onClick={() => {
                  if (project) {
                    onClose();
                    navigate(`${routePrefix}/project-detail`, {
                      state: {
                        projectId: project.id,
                        projectTitle: project.title,
                        backPath: `${routePrefix}/projects`
                      }
                    });
                  }
                }}
                disabled={isLoading || !project}
                className="p-2 hover:bg-blue-50 hover:text-primary-500 rounded-full transition-colors text-gray-700 bg-gray-50 active:scale-95 disabled:opacity-50"
                title="Open Full Page"
              >
                <Expand size={18} strokeWidth={2.5} />
              </button> */}
              {/* {isLoading && <Loader2 className="animate-spin text-primary-500 ml-2" size={20} />} */}
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center bg-[#FCFDFE]">
                <Loader size={48} />
              </div>
            ) : project ? (
              <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto no-scrollbar relative bg-[#FCFDFE]">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col p-8 gap-10 lg:border-r border-gray-100">
                  <div>
                    <Badge variant="info" className="mb-2 bg-blue-50 text-blue-600 border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Project Scope</Badge>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">{project.title}</h1>
                  </div>

                  {/* Metadata Row */}
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

                  {/* Workspace tab bar */}
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

                  {/* Modals placed at root level for visibility */}
                  {showRequestModel && projectId && (
                    <RequestExtensionModal
                      projectId={projectId}
                      projectName={project?.title || ''}
                      currentDeadline={project?.end_date}
                      onClose={() => setShowRequestModael(false)}
                    />
                  )}
                  <CreateMilestoneModal
                    isOpen={showCreateMilestone}
                    onClose={() => setShowCreateMilestone(false)}
                    projectId={projectId}
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

                  {/* Overview tab */}
                  {activeTab === 'overview' && (
                    <div className="flex flex-col gap-10 w-full">
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

                  {/* Milestones tab */}
                  {activeTab === 'milestones' && (
                  <div className="flex flex-col gap-6 w-full">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">Project Milestones</h3>
                      <Button
                        leftIcon={Plus}
                        onClick={() => setShowCreateMilestone(true)}
                        className="bg-[#005CDA11] hover:bg-[#005CDA22] border-none font-black text-[11px] h-9 rounded-xl py-0 px-4"
                      >
                        Create Milestone
                      </Button>
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

                    {milestones.map((milestone) => {
                      const tasks = milestone.tasks || [];
                      const totalTasks = tasks.length;
                      const doneTasks = tasks.filter((t) => t.status === 'DONE').length;
                      const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                      return (
                      <div key={milestone.id} className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
                        <button
                          onClick={() => toggleExpand(milestone.id)}
                          className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors border-b border-transparent data-[expanded=true]:border-gray-100"
                          data-expanded={expanded[milestone.id]}
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 size={18} strokeWidth={2.5} className={milestone.completed ? "text-[#005CDA]" : "text-gray-300"} />
                            <h3 className="font-black text-gray-900 tracking-tight text-[15px]">{milestone.title}</h3>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 w-48">
                              <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#005CDA] rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">{doneTasks}/{totalTasks} Done</span>
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
                                <button
                                  onClick={() => setMilestoneToDelete({ id: milestone.id, title: milestone.title })}
                                  className="flex items-center gap-2 text-red-500 font-black hover:bg-red-50 px-4 py-2 rounded-xl transition-all text-xs uppercase tracking-widest"
                                >
                                  Delete milestone
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      );
                    })}
                  </div>
                  )}

                  {/* Tasks tab — salvaged Kanban board */}
                  {activeTab === 'tasks' && projectId && (
                    <ProjectKanbanPanel projectId={projectId} />
                  )}

                  {/* Files tab */}
                  {activeTab === 'files' && projectId && (
                    <ProjectDocumentsPanel projectId={projectId} canEdit={canEditProject} />
                  )}

                  {/* Activity tab */}
                  {activeTab === 'activity' && projectId && (
                    <CommunicationTimeline projectId={projectId} />
                  )}

                  {/* Client Communication tab */}
                  {activeTab === 'communication' && projectId && (
                    <ClientCommunicationPanel projectId={projectId} canEdit={canEditProject} />
                  )}

                  {/* Infrastructure tab */}
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

                  {/* Dependencies tab */}
                  {activeTab === 'dependencies' && projectId && (
                    <DependenciesPanel projectId={projectId} canEdit={canEditProject} />
                  )}

                  {/* Team tab — reuses project_members.role grouping */}
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
                      MEMBER: 'Members',
                    };
                    const ROLE_ORDER = ['TEAM_LEAD', 'FRONTEND', 'BACKEND', 'QA', 'DEVOPS', 'UI_UX', 'AI_ENGINEER', 'BUSINESS_ANALYST', 'SALES', 'ESTIMATOR', 'MEMBER'];
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
                    );
                  })()}

                  {/* Financial tab */}
                  {activeTab === 'financial' && projectId && (
                    <BudgetPanel
                      projectId={projectId}
                      budget={project.budget}
                      budgetCurrency={project.budget_currency}
                      budgetSpent={project.budget_spent}
                      canEdit={canEditProject}
                    />
                  )}

                  {/* Settings tab — real project fields, no mock data */}
                  {activeTab === 'settings' && (
                    <div className="flex flex-col gap-4 w-full">
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">Project Settings</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Project Type</p>
                          <p className="text-sm font-bold text-gray-700">{project.project_type || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Progress Mode</p>
                          <p className="text-sm font-bold text-gray-700">{project.progress_mode || 'AUTO'}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Budget Currency</p>
                          <p className="text-sm font-bold text-gray-700">{project.budget_currency || 'PKR'}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-white p-4">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Client Name</p>
                          <p className="text-sm font-bold text-gray-700">{project.client_name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side Sidebar Widget */}
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
