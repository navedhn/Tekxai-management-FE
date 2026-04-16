import React from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import { Server } from '../chatTypes';

interface ServerRailProps {
  servers: Server[];
  activeServerId: string;
  onServerSelect: (server: Server) => void;
  onAddServer: () => void;
  onBack: () => void;
}

const ServerIcon: React.FC<{ server: Server; active: boolean; onClick: () => void }> = ({ server, active, onClick }) => (
  <div className="relative group flex items-center">
    {/* Active pill */}
    <span className={`absolute left-0 w-1 rounded-r-full bg-[#005CDA] transition-all duration-300 ${active ? 'h-9' : 'h-3 opacity-0 group-hover:opacity-100 group-hover:h-5'}`} />

    <button
      onClick={onClick}
      className={`ml-3 w-12 h-12 rounded-${active ? '2xl' : 'full'} bg-gradient-to-b ${server.color} flex items-center justify-center text-white font-black text-sm shadow-md transition-all duration-300 group-hover:rounded-2xl hover:shadow-lg active:scale-95 relative`}
      title={server.name}
    >
      {server.abbreviation}
      {server.hasNotification && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[8px] text-white font-black flex items-center justify-center">
          {server.unread}
        </span>
      )}
    </button>
  </div>
);

const ServerRail: React.FC<ServerRailProps> = ({ servers, activeServerId, onServerSelect, onAddServer, onBack }) => {
  return (
    <div className="w-[72px] bg-[#EAECF0] flex flex-col items-center py-3 gap-2 flex-shrink-0 border-r border-gray-200 h-full">
      <button
        onClick={onBack}
        className="w-12 h-12 rounded-full bg-white hover:bg-red-50 border border-gray-200 flex items-center justify-center transition-all duration-200 group active:scale-95 mb-1"
        title="Back to Dashboard"
      >
        <ArrowLeft size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" />
      </button>

      {servers.map(s => (
        <ServerIcon
          key={s.id}
          server={s}
          active={activeServerId === s.id}
          onClick={() => onServerSelect(s)}
        />
      ))}

      {/* Divider */}
      <div className="w-8 h-px bg-gray-300 my-1" />

      {/* Add Server Button */}
      <button
        onClick={onAddServer}
        className="w-12 h-12 rounded-full bg-white hover:bg-green-50 border-2 border-dashed border-gray-300 hover:border-green-500 flex items-center justify-center transition-all duration-200 group active:scale-95"
        title="Add a Server"
      >
        <Plus size={20} className="text-gray-400 group-hover:text-green-500 transition-colors" />
      </button>
    </div>
  );
};

export default ServerRail;
