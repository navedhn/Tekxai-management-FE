import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';

// Components
import ServerRail from './components/ServerRail';
import ChannelSidebar from './components/ChannelSidebar';
import ChatContent from './components/ChatContent';
import MemberSidebar from './components/MemberSidebar';
import CreateServerModal from './components/CreateServerModal';

// Types & Data
import { 
  Server, Channel, Message, SERVERS, CHANNELS, MESSAGES, CHAT_USERS 
} from './chatTypes';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  // Core State
  const [servers, setServers] = useState<Server[]>(SERVERS);
  const [activeServer, setActiveServer] = useState<Server>(SERVERS[0]);
  const [activeChannel, setActiveChannel] = useState<Channel>(CHANNELS[0]);
  const [messages, setMessages] = useState<Message[]>(MESSAGES);
  
  // UI State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUsersList, setShowUsersList] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile drawer

  // Reset sidebars on resize
  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const handleSendMessage = (content: string) => {
    const newMsg: Message = {
      id: `m${Date.now()}`,
      userId: 'me',
      username: 'You',
      content,
      timestamp: 'Just now',
    };
    setMessages(prev => [...prev, newMsg]);
  };

  return (
    <div className="fixed inset-0 flex bg-white overflow-hidden font-sans selection:bg-primary-100 selection:text-primary-900">
      
      {/* --- Desktop: Server Rail & Channel Sidebar --- */}
      {!isMobile && (
        <>
          <ServerRail
            servers={servers}
            activeServerId={activeServer.id}
            onServerSelect={setActiveServer}
            onAddServer={() => setShowCreateModal(true)}
            onBack={() => navigate(-1)}
          />
          <ChannelSidebar
            activeServer={activeServer}
            channels={CHANNELS}
            activeChannelId={activeChannel.id}
            onChannelSelect={setActiveChannel}
          />
        </>
      )}

      {/* --- Mobile: Drawer Navigation --- */}
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 flex z-[101] shadow-2xl"
            >
              <ServerRail
                servers={servers}
                activeServerId={activeServer.id}
                onServerSelect={setActiveServer}
                onAddServer={() => setShowCreateModal(true)}
                onBack={() => navigate(-1)}
              />
              <div className="w-64 bg-white">
                <ChannelSidebar
                  activeServer={activeServer}
                  channels={CHANNELS}
                  activeChannelId={activeChannel.id}
                  onChannelSelect={(ch) => {
                    setActiveChannel(ch);
                    setIsSidebarOpen(false);
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Main Chat Content --- */}
      <ChatContent
        activeChannel={activeChannel}
        messages={messages}
        onSendMessage={handleSendMessage}
        toggleMembers={() => setShowUsersList(!showUsersList)}
        toggleSidebar={() => setIsSidebarOpen(true)}
      />

      {/* --- Right: Members Sidebar (Desktop only for now or slide-over) --- */}
      {!isMobile && (
        <MemberSidebar
          isVisible={showUsersList}
          users={CHAT_USERS}
        />
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateServerModal
            onClose={() => setShowCreateModal(false)}
            onCreated={(s) => setServers(prev => [...prev, s])}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;
