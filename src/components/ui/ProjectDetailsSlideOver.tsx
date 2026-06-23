import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, CheckCircle2, Circle, MessageSquare, Plus, Trash2, ArrowRight as ArrowRightIcon, ArrowLeft, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import Badge from './Badge';
import Button from './Button';
import RequestExtensionModal from './RequestExtensionModal';
import CreateMilestoneModal from '../modals/CreateMilestoneModal';
import AddTaskModal from '../modals/AddTaskModal';
import { useGetProjectDetails } from '@/services/projectService';
import Loader from './Loader';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  routePrefix?: string;
}

const mockChecklists = [
  {
    id: 'c1',
    title: 'Backend Stuff (User Journey)',
    completed: 3,
    total: 7,
    items: [
      { id: 'i1', text: '1. Database Redesign', isDone: true, comments: 7, avatar: 'https://i.pravatar.cc/150?u=12' },
      { id: 'i2', text: '2. Setup Locations & Devices', isDone: true, comments: 7, avatar: 'https://i.pravatar.cc/150?u=13' },
      { id: 'i3', text: '3. Ads Duration 15 and 30 seconds', isDone: true, comments: 7, avatar: 'https://i.pravatar.cc/150?u=14' },
      { id: 'i4', text: '4. Cron job of creating video daily...', isDone: false, comments: 7, avatar: 'https://i.pravatar.cc/150?u=15' },
      { id: 'i5', text: '5. Limitation of images and videos...', isDone: false, comments: 7, avatar: 'https://i.pravatar.cc/150?u=16' },
      { id: 'i6', text: '6. Create playlist of ads and assign...', isDone: false, comments: 7, avatar: 'https://i.pravatar.cc/150?u=17' },
      { id: 'i7', text: '7. Limitation of images and videos...', isDone: false, comments: 7, avatar: 'https://i.pravatar.cc/150?u=18' },
    ]
  },
  {
    id: 'c2',
    title: 'Device End Stuff',
    completed: 0,
    total: 4,
    items: [
      { id: 'i8', text: '1. Database Redesign', isDone: false, comments: 7, avatar: 'https://i.pravatar.cc/150?u=12' },
      { id: 'i9', text: '2. Setup Configuration', isDone: false, comments: 2, avatar: 'https://i.pravatar.cc/150?u=13' },
    ]
  }
];

const ProjectDetailsSlideOver: React.FC<SlideOverProps> = ({ isOpen, onClose, projectId, routePrefix = '/admin' }) => {
  const navigate = useNavigate();
  const { data: project, isLoading } = useGetProjectDetails(projectId);
  const [lists, setLists] = useState(mockChecklists);
  const [showRequestModel, setShowRequestModael] = useState(false);
  const [showCreateMilestone, setShowCreateMilestone] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [activeMilestoneId, setActiveMilestoneId] = useState<string | number | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'c1': true, 'c2': true });

  const deleteItem = (listId: string, itemId: string) => {
    setLists(prev => prev.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: list.items.filter(item => item.id !== itemId)
        };
      }
      return list;
    }));
  };

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

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
                        {project.end_date && new Date(project.end_date) < new Date() && project.status !== 'COMPLETED' && (
                          <Badge variant="warning" className="bg-[#FFEB3B] text-yellow-900 border-none font-bold shadow-sm">Overdue</Badge>
                        )}
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
                      <Badge variant="info" className={cn(
                        "px-6 py-2 text-white font-black text-sm rounded-xl tracking-wide shadow-lg border-none",
                        project.status === 'COMPLETED' ? 'bg-[#00A36C] shadow-[#00A36C22]' : 'bg-[#005CDA] shadow-[#005CDA22]'
                      )}>
                        {project.status || 'PENDING'}
                      </Badge>
                    </div>
                  </div>

                  {/* Description Text */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-gray-900 font-black">
                      <MessageSquare size={18} strokeWidth={3} className="text-primary-500" />
                      <span>Project Description</span>
                    </div>
                    <div className="p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm tracking-tight text-gray-600 font-medium leading-relaxed text-[15px]">
                      {project.description || 'No description provided for this project.'}
                    </div>
                  </div>

                  {/* Modals placed at root level for visibility */}
                  {showRequestModel && projectId && (
                    <RequestExtensionModal
                      projectId={projectId}
                      projectName={project?.name || ''}
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
                    milestoneId={activeMilestoneId}
                    members={project?.all_members || project?.members || []}
                  />

                  {/* Dynamic Checklist Accordions */}
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
                    {lists.map((list) => (
                      <div key={list.id} className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
                        <button
                          onClick={() => toggleExpand(list.id)}
                          className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors border-b border-transparent data-[expanded=true]:border-gray-100"
                          data-expanded={expanded[list.id]}
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2 size={18} strokeWidth={2.5} className="text-primary-500" />
                            <h3 className="font-black text-gray-900 tracking-tight text-[15px]">{list.title}</h3>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 w-48">
                              <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#005CDA] rounded-full transition-all" style={{ width: `${(list.completed / list.total) * 100}%` }} />
                              </div>
                              <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">{list.completed}/{list.total} Done</span>
                            </div>
                            <ChevronDown size={20} className={cn("text-gray-400 transition-transform duration-300", expanded[list.id] && "rotate-180")} />
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {expanded[list.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="flex flex-col p-4 overflow-hidden bg-white"
                            >
                              <AnimatePresence>
                                {list.items.map((item) => (
                                  <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, x: -10 }}
                                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition-all"
                                  >
                                    <div className="flex items-start sm:items-center gap-3">
                                      {item.isDone ? (
                                        <CheckCircle2 size={24} className="text-[#005CDA] fill-[#005CDA]" color="white" />
                                      ) : (
                                        <Circle size={24} className="text-gray-200" />
                                      )}
                                      <span className={cn("text-[14px] font-bold tracking-tight", item.isDone ? "text-gray-400 line-through" : "text-gray-700")}>{item.text}</span>
                                    </div>

                                    <div className="flex items-center gap-4 mt-2 sm:mt-0 justify-end opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[10px] uppercase tracking-tighter bg-white border border-gray-100 px-2.5 py-1 rounded-lg">
                                        <MessageSquare size={13} /> {item.comments} Comments
                                      </div>
                                      <button onClick={() => deleteItem(list.id, item.id)} className="h-8 w-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                        <Trash2 size={16} strokeWidth={2.5} />
                                      </button>
                                    </div>
                                  </motion.div>
                                ))}
                              </AnimatePresence>

                              <div className="flex items-center justify-between p-4 border-t border-gray-50 mt-4">
                                <Button
                                  leftIcon={Plus}
                                  onClick={() => {
                                    setActiveMilestoneId(list.id);
                                    setShowAddTask(true);
                                  }}
                                  className="bg-primary-50 border-none font-black h-10 px-6 rounded-xl text-xs gap-2"
                                >
                                  Add task
                                </Button>
                                <button className="flex items-center gap-2 text-red-500 font-black hover:bg-red-50 px-4 py-2 rounded-xl transition-all text-xs uppercase tracking-widest">Delete milestone</button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
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
