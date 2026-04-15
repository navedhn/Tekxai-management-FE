import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Copy, ChevronDown, MoreVertical, Plus,
  MessageSquare, CheckCircle2, Circle
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { Button } from '@/components';

const mockMilestones = [
  {
    id: 'm1',
    title: 'Home Page',
    members: ['https://i.pravatar.cc/150?u=1', 'https://i.pravatar.cc/150?u=2', 'https://i.pravatar.cc/150?u=3', 'https://i.pravatar.cc/150?u=4'],
    hours: '20 Hours',
    assignee: 'Abdul Rehman',
    progress: 5,
    progressLabel: '5Hr',
    status: 'In Progress',
    dueDate: 'Jan-10-2025',
    deadline: 'Jan-12-2025',
    expanded: true,
    subItems: [
      { id: 's1', title: 'Hero Section', hours: '20 Hours', assignee: 'Abdul Rehman', progress: 60, progressLabel: '2Hr', status: 'Extended', dueDate: 'Jan-10-2025', deadline: 'Jan-12-2025' },
    ]
  },
  {
    id: 'm2',
    title: 'Dashboard Design',
    members: ['https://i.pravatar.cc/150?u=5', 'https://i.pravatar.cc/150?u=6', 'https://i.pravatar.cc/150?u=7', 'https://i.pravatar.cc/150?u=8'],
    hours: '20 Hours',
    assignee: 'Abdul Rehman',
    progress: 5,
    progressLabel: '5Hr',
    status: 'In Progress',
    dueDate: 'Jan-10-2025',
    deadline: 'Jan-12-2025',
    expanded: false,
    subItems: [
      { id: 's2', title: 'Analytics Widget', hours: '10 Hours', assignee: 'Sufyan Ilyas', progress: 80, progressLabel: '4Hr', status: 'Extended', dueDate: 'Jan-11-2025', deadline: 'Jan-13-2025' },
    ]
  },
  {
    id: 'm3',
    title: 'Web Design',
    members: ['https://i.pravatar.cc/150?u=9', 'https://i.pravatar.cc/150?u=10', 'https://i.pravatar.cc/150?u=11', 'https://i.pravatar.cc/150?u=12'],
    hours: '20 Hours',
    assignee: 'Abdul Rehman',
    progress: 5,
    progressLabel: '5Hr',
    status: 'In Progress',
    dueDate: 'Jan-10-2025',
    deadline: 'Jan-12-2025',
    expanded: false,
    subItems: []
  }
];

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
  const title = (location.state as any)?.projectTitle || 'Dashboard Design';
  const backPath = (location.state as any)?.backPath || -1;

  const [milestones, setMilestones] = useState(mockMilestones);

  const toggleMilestone = (id: string) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, expanded: !m.expanded } : m));
  };

  const tableHeaderClass = 'text-[12px] font-black text-gray-500 uppercase tracking-wider py-3 px-4 text-left bg-[#F8FAFF] border-b border-gray-100';
  const tableCellClass = 'py-4 px-4 text-[13px] font-medium text-gray-700';

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
            <h1 className="text-[24px] font-bold text-[#181D27] tracking-tight">{title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
              <span className="font-bold text-gray-700">Shareable Link:</span>
              <div className='border border-[#2525251A] rounded-[8px] p-2 flex items-center lg:min-w-[319px] justify-between'>
                <span className="text-gray-400 ">https://yododesigns.com/</span>
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
                  21 Mar, 20:00
                  <Badge variant="warning" className="bg-[#F5CD47] text-[#181D27] border-none p-1 ">Due Soon</Badge>
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
            <div className="bg-[#FAFBFF] border border-gray-100 rounded-2xl p-5 text-[14px] text-gray-600 font-medium leading-relaxed">
              My thoughts on this would be that the APC will need to determine the metrics of each length. For example: Facebook and Instagram ads recommend 30 second videos, TikTok recommends 15 seconds. Either way the first 3 seconds are the most important of any image or video to catch the attention. If I understand this correctly, I think we only need to have 3 to 5 bundled together for each device.
            </div>
          </div>

          {/* Add button */}
          <div className="flex justify-end">
            <Button leftIcon={Plus} className="flex items-center gap-2 bg-[#005CDA] hover:bg-[#0048B8] text-white font-black text-sm px-6 py-3 rounded-xl shadow-[0_4px_14px_rgba(0,92,218,0.3)] transition-all active:scale-95">
              Add
            </Button>
          </div>
        </div>

        {/* Milestones Table */}
        <div className="flex flex-col gap-4">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
              {/* Main Table Header */}
              {/* Main Table Container */}
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={cn(tableHeaderClass, 'w-[220px]')}>Project Title</th>
                      <th className={tableHeaderClass}>Members</th>
                      <th className={tableHeaderClass}>Projects Hours</th>
                      <th className={tableHeaderClass}>Assignee</th>
                      <th className={tableHeaderClass}>Progress</th>
                      <th className={tableHeaderClass}>Status</th>
                      <th className={tableHeaderClass}>Due Date</th>
                      <th className={tableHeaderClass}>Deadline</th>
                      <th className={cn(tableHeaderClass, 'w-10')}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Milestone Row */}
                    <tr className="hover:bg-gray-50/80 transition-colors border-b border-gray-50">
                      <td className={cn(tableCellClass, 'font-black')}>
                        <button
                          onClick={() => toggleMilestone(milestone.id)}
                          className="flex items-center gap-2 font-black text-gray-900 hover:text-primary-500 transition-colors group"
                        >
                          <ChevronDown
                            size={16}
                            className={cn('text-gray-400 transition-transform duration-300 group-hover:text-primary-500', milestone.expanded && 'rotate-0', !milestone.expanded && '-rotate-90')}
                          />
                          {milestone.title}
                        </button>
                      </td>
                      <td className={tableCellClass}>
                        <div className="flex -space-x-2">
                          {milestone.members.slice(0, 4).map((src, i) => (
                            <img key={i} src={src} className="w-7 h-7 rounded-full border-2 border-white shadow-sm" />
                          ))}
                        </div>
                      </td>
                      <td className={tableCellClass}>{milestone.hours}</td>
                      <td className={tableCellClass}>{milestone.assignee}</td>
                      <td className={tableCellClass}>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#005CDA]" />
                          <span className="text-[#005CDA] font-bold text-xs">{milestone.progressLabel}</span>
                        </div>
                      </td>
                      <td className={tableCellClass}>
                        <Badge variant="info" className={cn('rounded-lg px-3 py-1 text-[10px] font-black border', statusStyles[milestone.status] || '')}>
                          {milestone.status}
                        </Badge>
                      </td>
                      <td className={tableCellClass}>{milestone.dueDate}</td>
                      <td className={tableCellClass}>{milestone.deadline}</td>
                      <td className={tableCellClass}>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Expandable Sub-table */}
              <AnimatePresence initial={false}>
                {milestone.expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    {/* Sub items indented with left blue line border */}
                    <div className="ml-0 lg:ml-8 border-l-4 border-[#005CDA]/20">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className={cn(tableHeaderClass, 'w-[220px]')}>Milestone 1</th>
                              <th className={tableHeaderClass}>Projects Hours</th>
                              <th className={tableHeaderClass}>Assignee</th>
                              <th className={tableHeaderClass}>Progress</th>
                              <th className={tableHeaderClass}>Status</th>
                              <th className={tableHeaderClass}>Due Date</th>
                              <th className={tableHeaderClass}>Deadline</th>
                              <th className={cn(tableHeaderClass, 'w-10')}></th>
                            </tr>
                          </thead>
                          <tbody>
                            <AnimatePresence>
                              {milestone.subItems.map((sub) => (
                                <motion.tr
                                  key={sub.id}
                                  layout
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="hover:bg-blue-50/40 transition-colors border-b border-gray-50 last:border-0"
                                >
                                  <td className={cn(tableCellClass, 'font-bold text-gray-800')}>{sub.title}</td>
                                  <td className={tableCellClass}>{sub.hours}</td>
                                  <td className={tableCellClass}>{sub.assignee}</td>
                                  <td className={tableCellClass}>
                                    <div className="flex items-center gap-2">
                                      <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#005CDA] rounded-full" style={{ width: `${sub.progress}%` }} />
                                      </div>
                                      <span className="text-[#005CDA] font-bold text-xs">{sub.progressLabel}</span>
                                    </div>
                                  </td>
                                  <td className={tableCellClass}>
                                    <Badge variant="info" className={cn('rounded-lg px-3 py-1 text-[10px] font-black border', statusStyles[sub.status] || '')}>
                                      {sub.status}
                                    </Badge>
                                  </td>
                                  <td className={tableCellClass}>{sub.dueDate}</td>
                                  <td className={tableCellClass}>{sub.deadline}</td>
                                  <td className={tableCellClass}>
                                    <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                                      <MoreVertical size={16} />
                                    </button>
                                  </td>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </tbody>
                        </table>
                      </div>

                      {/* Add Item Row */}
                      <div className="px-4 py-3">
                        <button className="flex items-center gap-2 text-[#005CDA] font-black text-[13px] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                          <Plus size={14} strokeWidth={3} /> Add Item
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
