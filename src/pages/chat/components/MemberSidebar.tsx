import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Loader2 } from 'lucide-react';
import { getAvatarColor, getInitials } from '../chatTypes';

export interface MemberSidebarMember {
  id: string;
  name: string;
  designation?: string | null;
  avatar?: string | null;
  online: boolean;
}

interface MemberSidebarProps {
  isVisible: boolean;
  conversationId: string | null;
  members: MemberSidebarMember[];
  isLoading?: boolean;
  isError?: boolean;
  title?: string;

  compact?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const MemberSidebar: React.FC<MemberSidebarProps> = ({
  isVisible,
  conversationId,
  members,
  isLoading = false,
  isError = false,
  title = 'Members',
  compact = false,
  onClose,
  isMobile = false,
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSearch('');
  }, [conversationId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return members;
    return members.filter(m =>
      m.name.toLowerCase().includes(q) || (m.designation || '').toLowerCase().includes(q)
    );
  }, [members, search]);

  const online = useMemo(() => filtered.filter(m => m.online), [filtered]);
  const offline = useMemo(() => filtered.filter(m => !m.online), [filtered]);

  const renderMember = (member: MemberSidebarMember) => (
    <div
      key={member.id}
      className={`w-full flex items-center gap-2 py-1.5 rounded-md ${member.online ? '' : 'opacity-50'}`}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-8 h-8 rounded-full bg-gradient-to-b ${
          member.online ? getAvatarColor(member.name) : 'from-gray-300 to-gray-400'
        } flex items-center justify-center text-white text-[10px] font-bold overflow-hidden`}>
          {member.avatar ? (
            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            getInitials(member.name)
          )}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${member.online ? 'bg-green-500' : 'bg-gray-400'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${member.online ? 'text-gray-700' : 'text-gray-500'}`}>
          {member.name}
        </p>
        {member.designation && (
          <p className="text-[11px] text-gray-400 truncate">{member.designation}</p>
        )}
      </div>
    </div>
  );

  const body = isLoading ? (
    <div className="flex items-center justify-center py-10">
      <Loader2 size={18} className="animate-spin text-gray-300" />
    </div>
  ) : isError ? (
    <p className="text-xs text-gray-400 text-center py-8">Couldn't load members</p>
  ) : filtered.length === 0 ? (
    <p className="text-xs text-gray-400 text-center py-8">No members found</p>
  ) : compact ? (
    <div className="space-y-0.5">{filtered.map(renderMember)}</div>
  ) : (
    <>
      {online.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
            Online — {online.length}
          </p>
          <div className="space-y-0.5">{online.map(renderMember)}</div>
        </div>
      )}
      {offline.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
            Offline — {offline.length}
          </p>
          <div className="space-y-0.5">{offline.map(renderMember)}</div>
        </div>
      )}
    </>
  );

  const content = (
    <div className="flex flex-col h-full bg-[#F2F3F5]">
      <div className="h-14 px-3 flex items-center justify-between border-b border-[#E3E5E8] flex-shrink-0">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide truncate">
          {title} — {members.length}
        </h3>
        {isMobile && (
          <button onClick={onClose} className="p-1.5 hover:bg-[#E3E5E8] rounded text-gray-500 shrink-0">
            <X size={18} />
          </button>
        )}
      </div>

      {!compact && (
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
      )}

      <div className="flex-1 overflow-y-auto py-2 px-3 no-scrollbar">
        {body}
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
