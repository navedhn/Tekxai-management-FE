import React from 'react';
import { Hash, ChevronDown } from 'lucide-react';
import { Channel, Server, getAvatarColor } from '../chatTypes';
import { texailogo } from '@/assets/icons';

interface ChannelSidebarProps {
  activeServer: Server;
  channels: Channel[];
  activeChannelId: string;
  onChannelSelect: (channel: Channel) => void;
}

const ChannelSidebar: React.FC<ChannelSidebarProps> = ({ activeServer, channels, activeChannelId, onChannelSelect }) => {
  return (
    <div className="w-60 bg-white flex flex-col flex-shrink-0 border-r border-gray-200 h-full">
      {/* Server Header */}
      <div className="flex items-center justify-center border-b border-gray-200  ">
        <img src={texailogo} className="h-20 w-20 " />
      </div>
      <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 ">
        <h2 className="font-black text-gray-800 text-sm truncate">{activeServer.name}</h2>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {/* Text Channels Category */}
        <div className="px-2 pt-3 pb-1 flex items-center justify-between group cursor-pointer">
          <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Text Channels</span>
        </div>

        {channels.filter(c => c.type === 'text').map(ch => (
          <button
            key={ch.id}
            onClick={() => onChannelSelect(ch)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 group ${activeChannelId === ch.id
              ? 'bg-gradient-to-b from-[#005CDA] to-[#001F4A] text-white'
              : 'text-gray-500 hover:bg-[#D7DADC]/60 hover:text-gray-800'
              }`}
          >
            <Hash size={16} className={`flex-shrink-0 ${activeChannelId === ch.id ? 'opacity-100' : 'opacity-70'}`} />
            <span className="truncate flex-1 text-left">{ch.name}</span>
            {ch.unread && activeChannelId !== ch.id && (
              <span className="bg-[#005CDA] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{ch.unread}</span>
            )}
          </button>
        ))}
      </div>

      {/* User Panel (bottom) */}
      <div className="h-14 px-3 flex items-center gap-2 bg-[#E9EAEC] border-t border-gray-200">
        <div className={`w-8 h-8 rounded-full bg-gradient-to-b ${getAvatarColor('You')} flex items-center justify-center text-white text-xs font-black flex-shrink-0 relative`}>
          YO
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#E9EAEC]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-gray-800 truncate">You</p>
          <p className="text-[10px] text-gray-500 font-medium truncate">Online</p>
        </div>
      </div>
    </div>
  );
};

export default ChannelSidebar;
