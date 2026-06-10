import React, { useState, useMemo } from 'react';
import {
  Hash, MessageCircle, Plus, ChevronDown, Volume2, Search,
  Mic, Headphones, Settings,
} from 'lucide-react';
import { Channel, Server, getAvatarColor, getInitials, getStatusColor } from '../chatTypes';
import { truncatePreview } from '../chatUtils';
import { texailogo } from '@/assets/icons';

interface ChannelSidebarProps {
  activeServer: Server;
  channels: Channel[];
  directMessages: Channel[];
  activeChannelId: string;
  onChannelSelect: (channel: Channel) => void;
  onStartDm?: () => void;
}

const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  activeServer,
  channels,
  directMessages,
  activeChannelId,
  onChannelSelect,
  onStartDm,
}) => {
  const [search, setSearch] = useState('');
  const [textOpen, setTextOpen] = useState(true);
  const [voiceOpen, setVoiceOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);

  const isDmHome = activeServer.isDmHome;
  const query = search.toLowerCase().trim();

  const textChannels = useMemo(
    () => channels.filter(c => c.type === 'text' && (!query || c.name.toLowerCase().includes(query))),
    [channels, query]
  );
  const voiceChannels = useMemo(
    () => channels.filter(c => c.type === 'voice' && (!query || c.name.toLowerCase().includes(query))),
    [channels, query]
  );
  const filteredDms = useMemo(
    () => directMessages.filter(dm => {
      const name = (dm.recipientName || dm.name).toLowerCase();
      const preview = (dm.lastMessage || '').toLowerCase();
      return !query || name.includes(query) || preview.includes(query);
    }),
    [directMessages, query]
  );

  const channelBtnClass = (active: boolean, unread?: number) =>
    `w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[15px] transition-all duration-150 group ${
      active
        ? 'bg-[#D7DADC] text-gray-900'
        : unread
          ? 'text-gray-900 font-semibold hover:bg-[#D7DADC]/50'
          : 'text-gray-600 hover:bg-[#D7DADC]/50 hover:text-gray-900'
    }`;

  const renderDmItem = (dm: Channel) => {
    const isActive = activeChannelId === dm.id;
    const displayName = dm.recipientName || dm.name;

    return (
      <button
        key={dm.id}
        onClick={() => onChannelSelect(dm)}
        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all duration-150 group ${
          isActive ? 'bg-[#D7DADC]' : 'hover:bg-[#D7DADC]/50'
        }`}
      >
        <div className="relative flex-shrink-0">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-b ${getAvatarColor(displayName)} flex items-center justify-center text-white text-[10px] font-black`}>
            {getInitials(displayName)}
          </div>
          {dm.recipientStatus && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#F2F3F5] ${getStatusColor(dm.recipientStatus)}`} />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between gap-1">
            <span className={`text-sm truncate ${dm.unread && !isActive ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
              {displayName}
            </span>
            {dm.unread && !isActive && (
              <span className="bg-[#005CDA] text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center flex-shrink-0">
                {dm.unread}
              </span>
            )}
          </div>
          {dm.isTyping ? (
            <p className="text-[11px] text-[#005CDA] font-medium truncate">typing...</p>
          ) : dm.lastMessage ? (
            <p className="text-[11px] text-gray-400 font-medium truncate">{truncatePreview(dm.lastMessage)}</p>
          ) : null}
        </div>
      </button>
    );
  };

  const CategoryHeader: React.FC<{ label: string; open: boolean; onToggle: () => void; action?: React.ReactNode }> = ({
    label, open, onToggle, action,
  }) => (
    <div className="flex items-center justify-between px-1 py-1 group">
      <button onClick={onToggle} className="flex items-center gap-0.5 flex-1 min-w-0">
        <ChevronDown size={12} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide truncate">{label}</span>
      </button>
      {action}
    </div>
  );

  return (
    <div className="w-full sm:w-[240px] bg-[#F2F3F5] flex flex-col flex-shrink-0 h-full">
      {/* Brand header */}
      <div className="h-14 flex items-center justify-center border-b border-[#E3E5E8] flex-shrink-0">
        <img src={texailogo} alt="Tekxai" className="h-9 w-9 object-contain" />
      </div>

      {/* Search */}
      <div className="px-2 pt-2 pb-1 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full h-7 pl-8 pr-2 text-xs bg-[#E3E5E8] text-gray-700 placeholder:text-gray-400 rounded-md focus:outline-none focus:ring-1 focus:ring-[#005CDA]/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1 px-2 space-y-0.5 no-scrollbar">
        {isDmHome ? (
          <>
            <CategoryHeader
              label="Direct Messages"
              open={dmsOpen}
              onToggle={() => setDmsOpen(v => !v)}
              action={
                onStartDm && (
                  <button onClick={onStartDm} className="p-0.5 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" title="New DM">
                    <Plus size={14} />
                  </button>
                )
              }
            />
            {dmsOpen && (
              filteredDms.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <MessageCircle size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs text-gray-500">No conversations found</p>
                </div>
              ) : (
                <div className="space-y-0.5">{filteredDms.map(renderDmItem)}</div>
              )
            )}
          </>
        ) : (
          <>
            <CategoryHeader label="Text Channels" open={textOpen} onToggle={() => setTextOpen(v => !v)} />
            {textOpen && textChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => onChannelSelect(ch)}
                className={channelBtnClass(activeChannelId === ch.id, ch.unread)}
              >
                <Hash size={18} className="text-gray-400 flex-shrink-0 opacity-80" />
                <span className="truncate flex-1 text-left">{ch.name}</span>
                {ch.unread && activeChannelId !== ch.id && (
                  <span className="bg-[#005CDA] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                    {ch.unread}
                  </span>
                )}
              </button>
            ))}

            {voiceChannels.length > 0 && (
              <>
                <CategoryHeader label="Voice Channels" open={voiceOpen} onToggle={() => setVoiceOpen(v => !v)} />
                {voiceOpen && voiceChannels.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => onChannelSelect(ch)}
                    className={channelBtnClass(activeChannelId === ch.id)}
                  >
                    <Volume2 size={18} className="text-gray-400 flex-shrink-0 opacity-80" />
                    <span className="truncate flex-1 text-left">{ch.name}</span>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* User panel — Discord style */}
      <div className="h-[52px] px-2 flex items-center gap-1 bg-[#E9EAEC] flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 px-1 py-1 rounded hover:bg-[#D7DADC]/60 transition-colors cursor-pointer">
          <div className={`w-8 h-8 rounded-full bg-gradient-to-b ${getAvatarColor('You')} flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 relative`}>
            YO
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#E9EAEC]" />
          </div>
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">You</p>
            <p className="text-[11px] text-gray-500 truncate leading-tight">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {[
            { icon: Mic, label: 'Mute' },
            { icon: Headphones, label: 'Deafen' },
            { icon: Settings, label: 'Settings' },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              title={label}
              className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-[#D7DADC] rounded transition-colors"
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChannelSidebar;
