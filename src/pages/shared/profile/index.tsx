import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { useGetProjects, useGetMemberProfile } from '@/services/employeeService';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Loader from '@/components/ui/Loader';
import { useAuth } from '@/hooks/useAuth';

const workingHours = [
  { day: 'Mon', hours: '7Hr 30m', percent: 94 },
  { day: 'Tue', hours: '5Hr 00m', percent: 62 },
  { day: 'Wed', hours: '8Hr 00m', percent: 100 },
  { day: 'Thu', hours: '3Hr 30m', percent: 44 },
  { day: 'Fri', hours: '4Hr 50m', percent: 60 },
  { day: 'Sat', hours: '0Hr 00m', percent: 0 },
  { day: 'Sun', hours: '0Hr 00m', percent: 0 },
];

const appreciationIcons = ['👍','🎁','🏆','💰','👑','🍸','🎂','⑦','🚩','⭐','🍺',
  '🗑️','🏆','⚖️','👑','🎁','🍸','👍','⑦','🚩','⭐'];

const statusStyles: Record<string, string> = {
  'In Progress': 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
  'Overdue': 'bg-[#FFF1F3] text-[#C01048] border-[#FEB3B3]',
  'Pending': 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
  'Completed': 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]',
};

const ProfilePage: React.FC = () => {
  const { memberId } = useParams<{ memberId?: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('General');
  const { user } = useAuth();
  const isSelf = !memberId;
  const { data: remoteMember, isLoading } = useGetMemberProfile(memberId);
  const { data: projects } = useGetProjects();

  const member = useMemo(() => {
    if (isSelf && user) {
      return {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone || 'Not provided',
        department: user.department || 'General',
        position: user.position || 'Staff',
        role: user.rolesId === '7170d59d-1f19-4bda-b302-245c48dd18f8' ? 'Admin' : 'Employee',
        avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name + '+' + user.last_name)}&background=005CDA&color=fff&size=128`,
        status: 'Online' as const,
        lastSeen: 'Active now',
        workingHours: workingHours, // Use the local workingHours constant defined in this file
        totalProjects: 0
      };
    }
    return remoteMember;
  }, [isSelf, user, remoteMember]);

  if (isLoading && !isSelf) return <Loader fullPage size={48} />;
  if (!member) return <div className="p-10 text-center font-bold text-gray-500">Member not found</div>;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex items-center gap-4">
        {!isSelf && (
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          {isSelf ? 'My Profile' : 'User Profile'}
        </h1>
      </div>

      {/* Tabs */}
      <div className="w-fit">
        <Tabs
          options={['General', 'Task']}
          value={activeTab}
          onChange={setActiveTab}
          variant="pills"
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'General' && (
          <motion.div
            key="general"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-6"
          >
            {/* User Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary-500 to-blue-400 p-[2.5px] shadow-lg shadow-primary-100">
                  <div className="h-full w-full rounded-[0.85rem] bg-white p-[2px]">
                    <img
                      src={member.avatar}
                      className="h-full w-full rounded-[0.7rem] object-cover"
                    />
                  </div>
                </div>
                <div>
                  <h2 className="font-black text-gray-900 text-lg tracking-tight">{member.name}</h2>
                  <p className="text-gray-500 font-medium text-sm">{member.role}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge 
                  variant="info" 
                  className={cn(
                    "border font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5",
                    member.status === 'Online' ? "bg-green-50 text-green-500 border-green-100" : "bg-red-50 text-red-500 border-red-100"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full inline-block", member.status === 'Online' ? "bg-green-500" : "bg-red-500")} />
                  {member.status}
                </Badge>
                <span className="text-xs text-gray-400 font-medium">last seen {member.lastSeen}</span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-6">
                <h3 className="font-black text-gray-900 text-base">Contact Information</h3>
                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <p className="text-xs text-gray-400 font-bold mb-1">First Name:</p>
                    <p className="font-bold text-gray-800">{member.firstName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold mb-1">Last Name:</p>
                    <p className="font-bold text-gray-800">{member.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold mb-1">Contact email</p>
                    <p className="font-bold text-primary-500">{member.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold mb-1">Department:</p>
                    <p className="font-bold text-gray-800">{member.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold mb-1">Phone Number:</p>
                    <p className="font-bold text-gray-800">{member.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold mb-1">Position:</p>
                    <p className="font-bold text-gray-800">{member.position}</p>
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-gray-900 text-base">Working Hour</h3>
                  <span className="font-black text-gray-900 text-base">40 Hours</span>
                </div>
                <div className="flex flex-col gap-3">
                  {member.workingHours.map((item) => (
                    <div key={item.day} className="flex items-center gap-4">
                      <span className="text-sm font-bold text-gray-500 w-8">{item.day}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-[#005CDA] rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percent}%` }}
                          transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-500 w-14 text-right">{item.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appreciations */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-gray-900 text-base">Appreciations</h3>
                  <button className="flex items-center gap-2 text-primary-500 font-black text-sm border border-primary-200 px-4 py-2 rounded-xl hover:bg-primary-50 transition-colors">
                    Send Appreciations <Send size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {appreciationIcons.map((icon, i) => (
                    <button
                      key={i}
                      className="text-xl p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 hover:border-gray-200 hover:scale-110 active:scale-95"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
                <h3 className="font-black text-gray-900 text-base">Additional information</h3>
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="text-xs text-gray-400 font-bold mb-3">Supervisor</p>
                    <div className="flex flex-col gap-3">
                      {['Rafiqur Rehman', 'Rafiqur Rehman'].map((name, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <img src={`https://i.pravatar.cc/150?u=${i + 100}`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{name}</p>
                            <p className="text-gray-400 text-xs">Product Designer</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'Task' && (
          <motion.div
            key="task"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <h3 className="text-xl font-black text-gray-900 px-6 py-6 border-b border-gray-50 flex items-center justify-between">
              <span>Total Projects: {member.totalProjects}</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
              <tbody>
                {(projects || []).slice(0, 8).map((project, i) => (
                  <tr key={project.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="py-5 px-6 text-sm font-black text-gray-400 w-16">
                      0{i + 1}
                    </td>
                    <td className="py-5 px-4 text-sm font-black text-gray-900">
                      {project.title}
                    </td>
                    <td className="py-5 px-4">
                      <div className="flex -space-x-2">
                        {project.members.slice(0, 4).map((_, j) => (
                          <img key={j} src={`https://i.pravatar.cc/150?u=${i * 4 + j}`} className="w-7 h-7 rounded-full border-2 border-white shadow-sm" />
                        ))}
                      </div>
                    </td>
                    <td className="py-5 px-4 text-sm font-medium text-gray-600">{project.hours} Hours</td>
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-3 w-36">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#005CDA] rounded-full" style={{ width: `${project.progress}%` }} />
                        </div>
                        <span className="text-xs font-black text-gray-500">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="py-5 px-4">
                      <span className={cn('text-[11px] font-black px-3 py-1.5 rounded-lg border', statusStyles[project.status] || '')}>
                        {project.status}
                      </span>
                    </td>
                    <td className="py-5 px-4 text-sm font-medium text-gray-500">{project.dueDate}</td>
                    <td className="py-5 px-4">
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default ProfilePage;
