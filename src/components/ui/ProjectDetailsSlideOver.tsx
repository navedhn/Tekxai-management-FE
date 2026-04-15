import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Expand, ChevronDown, CheckCircle2, Circle, MessageSquare, Plus, Trash2, ArrowRight as ArrowRightIcon, ArrowLeft } from 'lucide-react';
import { cn } from '@/utils/cn';
import Badge from './Badge';
import Button from './Button';
import RequestTimeOffModal from './RequestTimeOffModal';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
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

const ProjectDetailsSlideOver: React.FC<SlideOverProps> = ({ isOpen, onClose, projectTitle, routePrefix = '/admin' }) => {
  const navigate = useNavigate();
  const [lists, setLists] = useState(mockChecklists);
  const [showRequestModel, setShowRequestModael] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'c1': true, 'c2': true });

  // Handle Animated Deletion Native to Framer Motion
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130]"
            onClick={onClose}
          />

          {/* Slide Over Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200, ease: "easeInOut" }}
            className="fixed inset-y-0 right-0 w-full md:w-[90%] xl:w-[80%] max-w-[1400px] h-full bg-white shadow-2xl z-[141] flex flex-col md:rounded-l-[2rem] overflow-hidden"
          >
            {/* Header Controls */}
            <div className="flex items-center gap-3 p-6 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700 bg-gray-50 active:scale-95">
                <ArrowLeft className="rotate-180" size={20} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => {
                  onClose();
                  navigate(`${routePrefix}/project-detail`, { state: { projectTitle, backPath: `${routePrefix}/projects` } });
                }}
                className="p-2 hover:bg-blue-50 hover:text-primary-500 rounded-full transition-colors text-gray-700 bg-gray-50 active:scale-95"
                title="Open Full Page"
              >
                <Expand size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto no-scrollbar relative bg-[#FCFDFE]">

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col p-8 gap-10 lg:border-r border-gray-100">
                {/* Title */}
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">{projectTitle || 'Dashboard Design'}</h1>
                </div>


                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-900 tracking-tight">Members</span>
                    <div className="flex -space-x-2">
                      <img src="https://i.pravatar.cc/150?u=1" className="w-8 h-8 rounded-full border-2 border-white relative z-30" />
                      <img src="https://i.pravatar.cc/150?u=2" className="w-8 h-8 rounded-full border-2 border-white relative z-20" />
                      <img src="https://i.pravatar.cc/150?u=3" className="w-8 h-8 rounded-full border-2 border-white relative z-10" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-900 tracking-tight">Due Date</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-black font-bold bg-white border border-gray-100 px-3 py-1.5 rounded-lg shadow-sm">21 Mar, 20:00</span>
                      <Badge variant="warning" className="bg-[#FFEB3B] text-yellow-900 border-none font-bold shadow-sm">Due Soon</Badge>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-900 tracking-tight">Reminder</span>
                    <div className="flex items-center">
                      <span className="text-sm font-bold bg-white border border-gray-100 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2 text-gray-700">
                        <MessageSquare size={14} /> 21 Mar, 19:00
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-900 tracking-tight">Label:</span>
                    <span className="px-6 py-2 bg-[#00A36C] text-white font-black text-sm rounded-xl tracking-wide shadow-[0_4px_14px_rgba(0,163,108,0.4)] w-fit">Completed</span>
                  </div>
                </div>

                {/* Description Text */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-gray-900 font-black">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" /></svg>
                    <span>Description</span>
                  </div>
                  <div className="p-6 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm tracking-tight text-gray-600 font-medium leading-relaxed text-[15px]">
                    My thoughts on this would be that the APC will need to determine the metrics of each length. For example: Facebook and Instagram ads recommend 30 second videos, TikTok recommends 15 seconds. Either way the first 3 seconds are the most important of any image or video to catch the attention. If I understand this correctly, I think we only need to have 3 to 5 bundled together for each device.
                  </div>
                </div>

                {/* Dynamic Checklist Accordions */}
                <div className="flex flex-col gap-6 w-full">
                  {lists.map((list) => (
                    <div key={list.id} className="flex flex-col bg-white border border-gray-100 rounded-[1.5rem] shadow-sm overflow-hidden">
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleExpand(list.id)}
                        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors border-b border-transparent data-[expanded=true]:border-gray-100"
                        data-expanded={expanded[list.id]}
                      >
                        <div className="flex items-center gap-3">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                          <h3 className="font-black text-gray-900 tracking-tight text-[15px]">{list.title}</h3>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 w-48">
                            <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#005CDA] rounded-full transition-all" style={{ width: `${(list.completed / list.total) * 100}%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">Completed: {list.completed} out of {list.total}</span>
                          </div>
                          <ChevronDown size={20} className={cn("text-gray-400 transition-transform duration-300", expanded[list.id] && "rotate-180")} />
                        </div>
                      </button>

                      {/* Accordion List Body using AnimatePresence for physical item deletions */}
                      <AnimatePresence initial={false}>
                        {expanded[list.id] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex flex-col p-2 overflow-hidden bg-white"
                          >
                            <AnimatePresence>
                              {list.items.map((item) => (
                                <motion.div
                                  key={item.id}
                                  layout
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95, x: -10 }}
                                  transition={{ duration: 0.2 }}
                                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 py-3 hover:bg-gray-50 rounded-xl transition-all"
                                >
                                  {/* Left Text */}
                                  <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
                                    {item.isDone ? (
                                      <CheckCircle2 size={24} className="text-[#005CDA] fill-[#005CDA]" color="white" />
                                    ) : (
                                      <Circle size={24} className="text-gray-200" />
                                    )}
                                    <span className="text-[14px] font-medium text-gray-700 tracking-tight">{item.text}</span>
                                  </div>

                                  {/* Right Actions */}
                                  <div className="flex items-center gap-4 mt-2 sm:mt-0 justify-end w-full sm:w-auto opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-1.5 text-gray-400 font-bold text-xs bg-white border border-gray-100 px-2 py-1 rounded-md">
                                      <MessageSquare size={14} /> {item.comments}
                                    </div>
                                    <img src={item.avatar} className="w-6 h-6 rounded-full shadow-sm" />
                                    {/* Animated Trigger for Deletion */}
                                    <button
                                      onClick={() => deleteItem(list.id, item.id)}
                                      className="h-7 w-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2"
                                    >
                                      <Trash2 size={14} strokeWidth={2.5} />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between p-4 border-t border-gray-50 mt-2">
                              <Button leftIcon={Plus} className="bg-[#E5F2FF] hover:bg-[#D1E8FF]  font-black h-10 px-5 rounded-xl border-none shadow-none text-sm gap-2">
                                Add item
                              </Button>
                              <button className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-colors text-sm">
                                <Trash2 size={16} /> Delete list
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}

                  {/* Add Checklist Meta */}
                  <div className=" py-5">
                    <Button leftIcon={Plus} fullWidth className="bg-[#E5F2FF] w-full hover:bg-[#D1E8FF]  font-black h-12 rounded-xl border-none shadow-none text-sm justify-center px-6 gap-3">
                      Add a New Checklist
                    </Button>
                  </div>

                </div>
              </div>

              {/* Right Side Sidebar Widget */}
              <div className="w-full lg:w-[320px] 2xl:w-[380px] bg-white p-8 flex flex-col gap-10 shrink-0">
                {/* Pending Summary */}
                <div className="flex flex-col rounded-2xl min-h-[200px] overflow-hidden bg-white border border-[#E5F2FF] shadow-sm">
                  <div className="bg-[#E5F2FF] px-5 py-4 font-black text-gray-900 tracking-tight text-[15px]">
                    Pending Since
                  </div>
                  <div className="p-5 flex flex-col gap-6">
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-sm font-bold text-gray-400 w-12">Stage:</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#005CDA] rounded-full" style={{ width: '25%' }} />
                      </div>
                      <span className="text-xs font-black text-gray-900">25%</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <span className="text-sm font-bold text-gray-400">Deadline Expand:</span>
                      <button onClick={() => setShowRequestModael(true)} className="flex justify-center items-center gap-2 w-fit bg-[#E5F2FF] hover:bg-[#D1E8FF] active:scale-95 transition-all text-[#005CDA] px-5 py-2 rounded-md font-black text-xs">
                        Send Request <ArrowRightIcon size={14} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
                <RequestTimeOffModal isOpen={showRequestModel} onClose={() => setShowRequestModael(false)} />

                {/* Metadata Core Matrix */}
                <div className="flex flex-col gap-5 text-[13px] font-bold text-gray-500">
                  <div className="flex items-center justify-between pb-5 border-b border-gray-100">
                    <span>Created on:</span>
                    <span className="text-gray-900">3/12/2025 1:52 pm</span>
                  </div>
                  <div className="flex items-center justify-between pb-5 border-b border-gray-100">
                    <span>Rating:</span>
                    <span className="text-gray-900">None</span>
                  </div>

                  <div className="flex flex-col gap-2 pb-5 border-b border-gray-100">
                    <span>Created by</span>
                    <div className="flex items-center gap-3 mt-2">
                      <img src="https://i.pravatar.cc/150?u=55" className="w-9 h-9 rounded-full shadow-sm" />
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-extrabold text-[14px]">Abdul Rehman</span>
                        <span className="text-gray-400 text-xs">Team Leader</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pb-5 border-b border-gray-100">
                    <span>Assignee</span>
                    <div className="flex items-center gap-3 mt-2">
                      <img src="https://i.pravatar.cc/150?u=55" className="w-9 h-9 rounded-full shadow-sm" />
                      <div className="flex flex-col">
                        <span className="text-gray-900 font-extrabold text-[14px]">Abdul Rehman</span>
                        <span className="text-gray-400 text-xs">Team Leader</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pb-5 border-gray-100">
                    <span>Participants</span>
                    <div className="flex items-center gap-3">
                      <img src="https://i.pravatar.cc/150?u=99" className="w-9 h-9 rounded-full shadow-sm" />
                      <span className="text-gray-900 font-extrabold text-[14px]">Sufyan Ilyas</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <img src="https://i.pravatar.cc/150?u=88" className="w-9 h-9 rounded-full shadow-sm" />
                      <span className="text-gray-900 font-extrabold text-[14px]">Mohammad Naved</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProjectDetailsSlideOver;
