import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Copy, ChevronDown, MoreVertical, Plus,
  MessageSquare, CheckCircle2, Circle
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { Button } from '@/components';
import { useGetProjectDetails } from '@/services/projectService';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import Loader from '@/components/ui/Loader';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import TaskDrawer from '@/components/kanban/TaskDrawer';
import { useKanbanTasks, useUpdateTask, type KanbanTask } from '@/services/tasksService';

const statusStyles: Record<string, string> = {
  'In Progress': 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
  'Overdue': 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]',
  'Pending': 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
  'Completed': 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]',
  'Extended': 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]',
};

const ProjectDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = (location.state as any)?.projectId;
  const backPath = (location.state as any)?.backPath || -1;
  const initialTitle = (location.state as any)?.projectTitle || 'Dashboard Design';

  const { data: project, isLoading } = useGetProjectDetails(projectId);

  const { data: milestonesData, isLoading: milestonesLoading } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await apiRequest<any>(API_ENDPOINTS.MILESTONE.LIST(projectId));
      return (res?.payload?.records || res?.payload || res || []) as any[];
    },
    enabled: !!projectId,
  });

  const [activeTab, setActiveTab] = useState<'milestones' | 'kanban'>('milestones');
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);

  const { data: kanbanTasks = [] } = useKanbanTasks(projectId);
  const updateTaskMutation = useUpdateTask(projectId);
  const logTimeMutation = useLogTime(selectedTask?.id ?? null);

  const handleUpdateTask = (taskId: string, updates: Partial<KanbanTask>) => {
    updateTaskMutation.mutate({ taskId, updates });
  };

  const handleLogTime = (taskId: string, seconds: number) => {
    apiRequest<any>(API_ENDPOINTS.TIME_LOGS(taskId), {
      method: 'POST',
      body: JSON.stringify({ seconds }),
    }).catch(() => {});
  };

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const milestones = (milestonesData || []).map((m: any) => ({
    ...m,
    expanded: expandedIds.has(m.id),
  }));

  const toggleMilestone = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const tableHeaderClass = 'text-[12px] font-black text-gray-500 uppercase tracking-wider py-3 px-4 text-left bg-[#F8FAFF] border-b border-gray-100';
  const tableCellClass = 'py-4 px-4 text-[13px] font-medium text-gray-700';

  if (isLoading) return <Loader fullPage size={60} />;

  return (
    <div className="min-h-screen ">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 ">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(backPath as any)}
            className="flex items-center gap-2 text-black font-black text-[14px] hover:bg-gray-50 px-4 py-2 rounded-xl transition-colors active:scale-95"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            Back To Project
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className=" flex flex-col gap-10">

        {/* Project Header */}
        <div className="flex flex-col gap-8 bg-white rounded-[8px] border border-gray-100 shadow-sm p-8">
          {/* Title Row */}
          <div className="flex items-center justify-between">
            <h1 className="text-[24px] font-bold text-[#181D27] tracking-tight">{project?.title || initialTitle}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
              <span className="font-bold text-gray-700">Shareable Link:</span>
              <div className='border border-[#2525251A] rounded-[8px] p-2 flex items-center lg:min-w-[319px] justify-between'>
                <span className="text-gray-400 ">https://tekxai.services</span>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#005CDA]">
                  <Copy size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
            {/* Members */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Members</span>
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {['1', '2', '3'].map((id) => (
                    <img key={id} src={`https://i.pravatar.cc/150?u=${id}`} className="w-9 h-9 rounded-full border-2 border-white shadow-sm" />
                  ))}
                </div>
                <button className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center -ml-2 bg-white hover:border-primary-400 hover:text-primary-500 transition-colors text-gray-400">
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Due Date</span>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 hover:border-gray-300 transition-colors shadow-sm">
                  {project?.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}
                  {project?.end_date && new Date(project.end_date) < new Date() && (
                    <Badge variant="warning" className="bg-[#F5CD47] text-[#181D27] border-none p-1 ">Overdue</Badge>
                  )}
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {/* Reminder */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Reminder</span>
              <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 hover:border-gray-300 transition-colors shadow-sm">
                <MessageSquare size={14} className="text-gray-400" />
                21 Mar, 19:00
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Label */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Label:</span>
              <button className="flex items-center gap-2 bg-[#059900] text-white font-black text-sm rounded-xl px-5 py-2  transition-colors shadow-[0_4px_12px_rgba(0,163,108,0.3)]">
                Completed
                <ChevronDown size={14} />
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" /></svg>
              <span className="font-black text-gray-900">Description</span>
            </div>
          </div>
          <div className="bg-[#FAFBFF] border border-gray-100 rounded-2xl p-5 text-[14px] text-gray-600 font-medium leading-relaxed">
            {project?.description || 'No description provided for this project.'}
          </div>
        </div>

        {/* Add button */}
        <div className="flex justify-end">
          <Button leftIcon={Plus} className="flex items-center gap-2 bg-[#005CDA] hover:bg-[#0048B8] text-white font-black text-sm px-6 py-3 rounded-xl shadow-[0_4px_14px_rgba(0,92,218,0.3)] transition-all active:scale-95">
            Add
          </Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('milestones')}
          className={cn(
            'text-sm font-black px-5 py-2 rounded-lg transition-all',
            activeTab === 'milestones' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Milestones
        </button>
        <button
          onClick={() => setActiveTab('kanban')}
          className={cn(
            'text-sm font-black px-5 py-2 rounded-lg transition-all',
            activeTab === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Kanban
        </button>
      </div>

      {/* Kanban View */}
      {activeTab === 'kanban' && (
        <>
          <KanbanBoard
            tasks={kanbanTasks}
            onUpdateTask={handleUpdateTask}
            onLogTime={handleLogTime}
            onSelectTask={setSelectedTask}
          />
          <TaskDrawer
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdateTask={handleUpdateTask}
          />
        </>
      )}

      {/* Milestones Table */}
      {activeTab === 'milestones' && <div className="flex flex-col gap-4">
        {milestonesLoading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 flex items-center justify-center">
            <Loader size={36} />
          </div>
        )}
        {!milestonesLoading && milestones.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 font-semibold text-sm">
            No milestones yet for this project.
          </div>
        )}
        {milestones.map((milestone) => {
          const tasks: any[] = milestone.tasks || [];
          const totalTasks = tasks.length;
          const doneTasks = tasks.filter((t: any) => t.status === 'Completed' || t.completed).length;
          const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
          const status = milestone.completed ? 'Completed' : (milestone.due_date && new Date(milestone.due_date) < new Date() ? 'Overdue' : 'In Progress');
          return (
          <div key={milestone.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={cn(tableHeaderClass, 'w-[240px]')}>Milestone</th>
                    <th className={tableHeaderClass}>Tasks</th>
                    <th className={tableHeaderClass}>Progress</th>
                    <th className={tableHeaderClass}>Status</th>
                    <th className={tableHeaderClass}>Due Date</th>
                    <th className={cn(tableHeaderClass, 'w-10')}></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50/80 transition-colors border-b border-gray-50">
                    <td className={cn(tableCellClass, 'font-black')}>
                      <button
                        onClick={() => toggleMilestone(milestone.id)}
                        className="flex items-center gap-2 font-black text-gray-900 hover:text-primary-500 transition-colors group"
                      >
                        <ChevronDown
                          size={16}
                          className={cn('text-gray-400 transition-transform duration-300 group-hover:text-primary-500', milestone.expanded ? 'rotate-0' : '-rotate-90')}
                        />
                        {milestone.title}
                      </button>
                      {milestone.description && (
                        <p className="text-xs text-gray-400 font-medium mt-0.5 pl-6">{milestone.description}</p>
                      )}
                    </td>
                    <td className={tableCellClass}>{doneTasks}/{totalTasks}</td>
                    <td className={tableCellClass}>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#005CDA] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[#005CDA] font-bold text-xs">{pct}%</span>
                      </div>
                    </td>
                    <td className={tableCellClass}>
                      <Badge variant="info" className={cn('rounded-lg px-3 py-1 text-[10px] font-black border', statusStyles[status] || '')}>
                        {status}
                      </Badge>
                    </td>
                    <td className={tableCellClass}>
                      {milestone.due_date ? new Date(milestone.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className={tableCellClass}>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Expandable tasks */}
            <AnimatePresence initial={false}>
              {milestone.expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="ml-0 lg:ml-8 border-l-4 border-[#005CDA]/20">
                    {tasks.length === 0 ? (
                      <div className="px-6 py-4 text-sm text-gray-400 font-medium">No tasks in this milestone.</div>
                    ) : (
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className={cn(tableHeaderClass, 'w-[240px]')}>Task</th>
                              <th className={tableHeaderClass}>Assignee</th>
                              <th className={tableHeaderClass}>Status</th>
                              <th className={tableHeaderClass}>Due Date</th>
                              <th className={cn(tableHeaderClass, 'w-10')}></th>
                            </tr>
                          </thead>
                          <tbody>
                            <AnimatePresence>
                              {tasks.map((task: any) => {
                                const taskStatus = task.status || (task.completed ? 'Completed' : 'Pending');
                                return (
                                  <motion.tr
                                    key={task.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="hover:bg-blue-50/40 transition-colors border-b border-gray-50 last:border-0"
                                  >
                                    <td className={cn(tableCellClass, 'font-bold text-gray-800 flex items-center gap-2')}>
                                      {taskStatus === 'Completed' ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> : <Circle size={14} className="text-gray-300 shrink-0" />}
                                      {task.title}
                                    </td>
                                    <td className={tableCellClass}>{task.assignee?.first_name ? `${task.assignee.first_name} ${task.assignee.last_name || ''}`.trim() : '—'}</td>
                                    <td className={tableCellClass}>
                                      <Badge variant="info" className={cn('rounded-lg px-3 py-1 text-[10px] font-black border', statusStyles[taskStatus] || '')}>
                                        {taskStatus}
                                      </Badge>
                                    </td>
                                    <td className={tableCellClass}>
                                      {task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                    </td>
                                    <td className={tableCellClass}>
                                      <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                                        <MoreVertical size={16} />
                                      </button>
                                    </td>
                                  </motion.tr>
                                );
                              })}
                            </AnimatePresence>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          );
        })}
      </div>}
    </div>
  );
};

export default ProjectDetailPage;
