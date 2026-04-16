import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatUser, getAvatarColor, getInitials } from '../chatTypes';

interface MemberSidebarProps {
  isVisible: boolean;
  users: ChatUser[];
}

const MemberSidebar: React.FC<MemberSidebarProps> = ({ isVisible, users }) => {
  const onlineUsers = users.filter(u => u.status !== 'offline');
  const offlineUsers = users.filter(u => u.status === 'offline');

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="bg-[#F2F3F5] border-l border-gray-200 flex flex-col overflow-hidden flex-shrink-0 h-full"
        >
          <div className="flex-1 overflow-y-auto py-4 px-3 no-scrollbar">
            {/* Online Users */}
            <div className="mb-2 px-1">
              <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">
                Online — {onlineUsers.length}
              </p>
              <div className="space-y-0.5">
                {onlineUsers.map(user => (
                  <button
                    key={user.id}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#D7DADC] transition-colors group text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-b ${getAvatarColor(user.name)} flex items-center justify-center text-white text-[10px] font-black`}>
                        {getInitials(user.name)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#F2F3F5] ${user.status === 'online' ? 'bg-green-500' :
                        user.status === 'idle' ? 'bg-yellow-400' :
                          user.status === 'dnd' ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-700 truncate group-hover:text-gray-900">{user.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium truncate">{user.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Offline Users */}
            <div className="mt-4 px-1">
              <p className="text-[11px] font-black text-gray-500 uppercase tracking-wider mb-2">
                Offline — {offlineUsers.length}
              </p>
              <div className="space-y-0.5">
                {offlineUsers.map(user => (
                  <button
                    key={user.id}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#D7DADC] transition-colors group text-left opacity-50 hover:opacity-70"
                  >
                    <div className="relative flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-b from-gray-300 to-gray-400 flex items-center justify-center text-white text-[10px] font-black`}>
                        {getInitials(user.name)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#F2F3F5] bg-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-600 truncate">{user.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium truncate">{user.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MemberSidebar;
