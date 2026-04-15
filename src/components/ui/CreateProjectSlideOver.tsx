import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Calendar, Clock, X, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import Button from './Button';

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
}

const mockMembers: TeamMember[] = [
  { id: '1', name: 'Rafiqur Rehman', avatar: 'https://i.pravatar.cc/150?u=55' },
  { id: '2', name: 'Sufyan Ilyas', avatar: 'https://i.pravatar.cc/150?u=99' },
  { id: '3', name: 'Mohammad Naved', avatar: 'https://i.pravatar.cc/150?u=88' },
  { id: '4', name: 'Abdul Rehman', avatar: 'https://i.pravatar.cc/150?u=77' },
];

interface CreateProjectSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

const AvatarChip: React.FC<{ member: TeamMember; onRemove: () => void }> = ({ member, onRemove }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.85 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.85 }}
    className="flex items-center gap-2 bg-white border border-gray-100 rounded-full pl-1 pr-3 py-1 shadow-sm"
  >
    <img src={member.avatar} className="w-7 h-7 rounded-full object-cover" />
    <span className="text-[13px] font-bold text-gray-700">{member.name}</span>
    <button onClick={onRemove} className="ml-1 text-gray-400 hover:text-red-400 transition-colors">
      <X size={13} strokeWidth={2.5} />
    </button>
  </motion.div>
);

const CreateProjectSlideOver: React.FC<CreateProjectSlideOverProps> = ({ isOpen, onClose }) => {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('20/03/2023');
  const [endDate, setEndDate] = useState('20/03/2023');
  const [totalHours] = useState('80 Hours');

  const [projectOwners, setProjectOwners] = useState<TeamMember[]>([mockMembers[0]]);
  const [teamLeaders, setTeamLeaders] = useState<TeamMember[]>([mockMembers[0]]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([mockMembers[0], mockMembers[1], mockMembers[2]]);

  const addNextAvailable = (
    list: TeamMember[],
    setList: React.Dispatch<React.SetStateAction<TeamMember[]>>
  ) => {
    const used = list.map((m) => m.id);
    const next = mockMembers.find((m) => !used.includes(m.id));
    if (next) setList([...list, next]);
  };

  const removeMember = (
    id: string,
    list: TeamMember[],
    setList: React.Dispatch<React.SetStateAction<TeamMember[]>>
  ) => setList(list.filter((m) => m.id !== id));

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all bg-white';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[140]"
            onClick={onClose}
          />

          {/* Slide Over */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-y-0 right-0 w-full md:w-[540px] bg-[#F7F8FC] shadow-2xl z-[141] flex flex-col overflow-hidden md:rounded-l-[2rem]"
          >
            {/* Close Arrow Header */}
            <div className="px-8 pt-8 pb-2 shrink-0">
              <button
                onClick={onClose}
                className="h-7 w-10 rounded-full bg-[#D5D5D54D] border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
              >
                <ArrowRight size={16} strokeWidth={2.5} className="text-gray-700" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-8 no-scrollbar">
              {/* About Project */}
              <div className="flex flex-col gap-6">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">About Project</h2>

                {/* Project Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-black text-gray-700">Project Name</label>
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                    className={inputClass}
                  />
                </div>

                {/* Project Description */}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-black text-gray-700">Project Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter project description"
                    rows={5}
                    className={cn(inputClass, 'resize-none')}
                  />
                  <p className="text-xs text-gray-400 font-medium">Add project description for the team members</p>
                </div>
              </div>

              {/* Project Parameters */}
              <div className="flex flex-col gap-4">
                <h3 className="text-base font-black text-gray-900">Project Parameters</h3>
                <div className="grid grid-cols-[1fr_auto_1fr_1fr] items-end gap-3">
                  {/* Start Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-black text-gray-600">Start Date</label>
                    <div className="relative">
                      <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={cn(inputClass, 'pl-9 text-[13px]')}
                      />
                    </div>
                  </div>
                  <span className="text-gray-400 font-bold text-sm pb-3">to</span>
                  {/* End Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-black text-gray-600">End Dates</label>
                    <div className="relative">
                      <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={cn(inputClass, 'pl-9 text-[13px]')}
                      />
                    </div>
                  </div>
                  {/* Total Hours */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-black text-gray-600">Total Hours</label>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 bg-white shadow-sm">
                      <Clock size={15} className="text-gray-400 shrink-0" />
                      <span className="text-[13px] font-bold text-gray-700">{totalHours}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="flex flex-col gap-6">
                <h3 className="text-base font-black text-gray-900">Team members</h3>

                {/* Project Owner */}
                <div className="flex flex-col gap-3">
                  <label className="text-[13px] font-bold text-gray-600">Project Owner</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <AnimatePresence>
                      {projectOwners.map((m) => (
                        <AvatarChip key={m.id} member={m} onRemove={() => removeMember(m.id, projectOwners, setProjectOwners)} />
                      ))}
                    </AnimatePresence>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => addNextAvailable(projectOwners, setProjectOwners)}
                      className="h-9 w-9 rounded-full bg-[#005CDA1A] text-[#292D32] flex items-center justify-center transition-colors shadow-md shadow-primary-200"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>

                {/* Team Leader */}
                <div className="flex flex-col gap-3">
                  <label className="text-[13px] font-bold text-gray-600">Team Leader</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <AnimatePresence>
                      {teamLeaders.map((m) => (
                        <AvatarChip key={m.id} member={m} onRemove={() => removeMember(m.id, teamLeaders, setTeamLeaders)} />
                      ))}
                    </AnimatePresence>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => addNextAvailable(teamLeaders, setTeamLeaders)}
                      className="h-9 w-9 rounded-full bg-[#005CDA1A] text-[#292D32] flex items-center justify-center  transition-colors shadow-md shadow-primary-200"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>

                {/* Team Members */}
                <div className="flex flex-col gap-3">
                  <label className="text-[13px] font-bold text-gray-600">Team Members</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <AnimatePresence>
                      {teamMembers.map((m) => (
                        <AvatarChip key={m.id} member={m} onRemove={() => removeMember(m.id, teamMembers, setTeamMembers)} />
                      ))}
                    </AnimatePresence>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => addNextAvailable(teamMembers, setTeamMembers)}
                      className="h-9 w-9 rounded-full bg-[#005CDA1A] text-[#292D32] flex items-center justify-center  transition-colors shadow-md shadow-primary-200"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Extra bottom padding so last input isn't cut off */}
              <div className="h-4" />
            </div>

            {/* Footer Action */}
            <div className="px-8 py-6 bg-white border-t border-gray-100 shrink-0">
              <Button
                className="w-full bg-[#005CDA] hover:bg-[#0048B8] active:scale-[0.98] text-white font-black text-[15px] py-4 rounded-2xl transition-all shadow-[0_4px_20px_rgba(0,92,218,0.35)]"
                onClick={onClose}
              >
                Create Project
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CreateProjectSlideOver;
