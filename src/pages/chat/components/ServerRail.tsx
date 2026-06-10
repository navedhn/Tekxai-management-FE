import React, { useState } from 'react';
import { Plus, ArrowLeft, MessageCircle } from 'lucide-react';
import { Server } from '../chatTypes';

interface ServerRailProps {
  servers: Server[];
  activeServerId: string;
  onServerSelect: (server: Server) => void;
  onAddServer: () => void;
  onBack: () => void;
  dmHomeServer: Server;
}

const ServerIcon: React.FC<{
  server: Server; active: boolean; onClick: () => void; isDm?: boolean;
}> = ({ server, active, onClick, isDm }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative group flex items-center w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Active / hover pill */}
      <span className={`absolute left-0 w-1 rounded-r-full bg-gray-900 transition-all duration-200 ${
        active ? 'h-10' : hovered ? 'h-5 opacity-100' : 'h-2 opacity-0'
      }`} />

      {/* Tooltip */}
      <div className={`absolute left-[calc(100%+12px)] z-50 pointer-events-none transition-all duration-150 ${
        hovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'
      }`}>
        <div className="bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg whitespace-nowrap">
          {server.name}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
        </div>
      </div>

      <button
        onClick={onClick}
        className={`ml-3 w-12 h-12 ${active ? 'rounded-2xl' : 'rounded-full'} ${
          isDm
            ? 'bg-gradient-to-b from-[#005CDA] to-[#001F4A]'
            : `bg-gradient-to-b ${server.color}`
        } flex items-center justify-center text-white font-black text-sm transition-all duration-200 hover:rounded-2xl active:scale-95 relative`}
      >
        {isDm ? <MessageCircle size={22} /> : server.abbreviation}
        {server.hasNotification && (
          <span className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] px-0.5 bg-red-500 rounded-full border-[3px] border-[#EAECF0] text-[9px] text-white font-bold flex items-center justify-center">
            {server.unread}
          </span>
        )}
      </button>
    </div>
  );
};

const ServerRail: React.FC<ServerRailProps> = ({
  servers, activeServerId, onServerSelect, onAddServer, onBack, dmHomeServer,
}) => (
  <div className="w-[72px] bg-[#EAECF0] flex flex-col items-center py-3 gap-2 flex-shrink-0 h-full overflow-y-auto no-scrollbar">
    <button
      onClick={onBack}
      className="w-12 h-12 rounded-full bg-white hover:bg-[#D7DADC] flex items-center justify-center transition-all duration-200 active:scale-95 mb-1"
      title="Back to Dashboard"
    >
      <ArrowLeft size={18} className="text-gray-600" />
    </button>

    <ServerIcon
      server={dmHomeServer}
      active={activeServerId === dmHomeServer.id}
      onClick={() => onServerSelect(dmHomeServer)}
      isDm
    />

    <div className="w-8 h-[2px] rounded-full bg-[#D7DADC] my-0.5" />

    {servers.map(s => (
      <ServerIcon
        key={s.id}
        server={s}
        active={activeServerId === s.id}
        onClick={() => onServerSelect(s)}
      />
    ))}

    <div className="w-8 h-[2px] rounded-full bg-[#D7DADC] my-0.5" />

    <button
      onClick={onAddServer}
      className="w-12 h-12 rounded-full bg-white hover:bg-green-50 hover:rounded-2xl border-2 border-dashed border-gray-300 hover:border-green-500 flex items-center justify-center transition-all duration-200 active:scale-95"
      title="Add a Server"
    >
      <Plus size={22} className="text-green-600" />
    </button>
  </div>
);

export default ServerRail;
