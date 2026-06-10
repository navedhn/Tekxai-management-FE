import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { ChatUser, getAvatarColor, getInitials, getStatusColor } from '../chatTypes';

interface MemberSidebarProps {
  isVisible: boolean;
  users: ChatUser[];
  onUserSelect?: (user: ChatUser) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

const MemberSidebar: React.FC<MemberSidebarProps> = ({
  isVisible,
  users,
  onUserSelect,
  onClose,
  isMobile = false,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u =>
      u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  const groupedByRole = useMemo(() => {
    const map = new Map<string, ChatUser[]>();
    filtered.forEach(user => {
      const list = map.get(user.role) || [];
      list.push(user);
      map.set(user.role, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const renderUser = (user: ChatUser) => {
    const isOffline = user.status === 'offline';
    return (
      <button
        key={user.id}
        onClick={() => onUserSelect?.(user)}
        className={`w-full flex items-center gap-2 py-1.5 rounded-md hover:bg-[#E3E5E8] transition-colors group text-left ${
          isOffline ? 'opacity-50 hover:opacity-70' : ''
        }`}
      >
        <div className="relative flex-shrink-0">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-b ${
            isOffline ? 'from-gray-300 to-gray-400' : getAvatarColor(user.name)
          } flex items-center justify-center text-white text-[10px] font-bold`}>
            {getInitials(user.name)}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${isOffline ? 'text-gray-500' : 'text-gray-700 group-hover:text-gray-900'}`}>
            {user.name}
          </p>
        </div>
        <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium hidden sm:block flex-shrink-0">
          Message
        </span>
      </button>
    );
  };

  const content = (
    <div className="flex flex-col h-full bg-[#F2F3F5]">
      <div className="h-14 px-3 flex items-center justify-between border-b border-[#E3E5E8] flex-shrink-0">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide truncate">
          Members — {users.length}
        </h3>
        {isMobile && (
          <button onClick={onClose} className="p-1.5 hover:bg-[#E3E5E8] rounded text-gray-500 shrink-0">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="px-3 py-2 flex-shrink-0">
        <div className="relative w-full">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members"
            className="w-full h-7 pl-8 pr-2 text-xs bg-[#E3E5E8] rounded-md focus:outline-none focus:ring-1 focus:ring-[#005CDA]/30 text-gray-700 placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-3 no-scrollbar">
        {groupedByRole.map(([role, roleUsers]) => (
          <div key={role} className="mb-3">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
              {role} — {roleUsers.length}
            </p>
            <div className="space-y-0.5">
              {roleUsers.map(renderUser)}
            </div>
          </div>
        ))}
        {groupedByRole.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">No members found</p>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isVisible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[102]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-[min(100%,260px)] z-[103] shadow-2xl"
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-l border-[#E3E5E8] flex flex-col overflow-hidden flex-shrink-0 h-full"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MemberSidebar;
