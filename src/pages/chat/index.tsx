import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';

import ServerRail from './components/ServerRail';
import ChannelSidebar from './components/ChannelSidebar';
import ChatContent from './components/ChatContent';
import MemberSidebar from './components/MemberSidebar';
import CreateServerModal from './components/CreateServerModal';

import {
  Server, Channel, Message, MessageAttachment, MessageReplyRef, ChatUser,
  DM_HOME_SERVER, SERVERS, CHANNELS, DIRECT_MESSAGES,
  CHAT_USERS, INITIAL_MESSAGES_BY_CONVERSATION,
} from './chatTypes';
import { truncatePreview } from './chatUtils';

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const [servers, setServers] = useState<Server[]>(SERVERS);
  const [activeServer, setActiveServer] = useState<Server>(SERVERS[0]);
  const [directMessages, setDirectMessages] = useState<Channel[]>(DIRECT_MESSAGES);
  const [activeConversation, setActiveConversation] = useState<Channel>(CHANNELS[0]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>(
    () => ({ ...INITIAL_MESSAGES_BY_CONVERSATION })
  );

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUsersList, setShowUsersList] = useState(!isMobile);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const currentMessages = messagesByConversation[activeConversation.id] ?? [];

  const typingUsersForChannel = useMemo(() => {
    if (activeConversation.type === 'dm' && activeConversation.isTyping) {
      return [activeConversation.recipientName || activeConversation.name];
    }
    return typingUsers;
  }, [activeConversation, typingUsers]);

  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(false);
      setShowUsersList(true);
    } else {
      setShowUsersList(false);
    }
  }, [isMobile]);

  // Simulate typing indicator in active DM
  useEffect(() => {
    if (activeConversation.type !== 'dm' || activeConversation.id !== 'dm-u2') {
      setTypingUsers([]);
      return;
    }
    const timer = setTimeout(() => {
      setTypingUsers(['Sarah Chen']);
      const clear = setTimeout(() => setTypingUsers([]), 4000);
      return () => clearTimeout(clear);
    }, 2000);
    return () => clearTimeout(timer);
  }, [activeConversation.id, activeConversation.type]);

  const handleServerSelect = useCallback((server: Server) => {
    setActiveServer(server);
    if (server.isDmHome) {
      const firstDm = directMessages[0];
      if (firstDm) setActiveConversation(firstDm);
    } else {
      const firstChannel = CHANNELS.find(c => c.type === 'text');
      if (firstChannel) setActiveConversation(firstChannel);
    }
  }, [directMessages]);

  const handleConversationSelect = useCallback((conversation: Channel) => {
    setActiveConversation(conversation);
    if (conversation.type === 'dm') {
      setActiveServer(DM_HOME_SERVER);
      setDirectMessages(prev =>
        prev.map(dm => dm.id === conversation.id ? { ...dm, unread: undefined, isTyping: false } : dm)
      );
    }
    if (isMobile) setIsSidebarOpen(false);
  }, [isMobile]);

  const openDmWithUser = useCallback((user: ChatUser) => {
    const existingDm = directMessages.find(dm => dm.recipientId === user.id);

    if (existingDm) {
      setActiveConversation(existingDm);
    } else {
      const newDm: Channel = {
        id: `dm-${user.id}`,
        name: user.name,
        type: 'dm',
        recipientId: user.id,
        recipientName: user.name,
        recipientStatus: user.status,
      };
      setDirectMessages(prev => [...prev, newDm]);
      setMessagesByConversation(prev => ({ ...prev, [newDm.id]: [] }));
      setActiveConversation(newDm);
    }

    setActiveServer(DM_HOME_SERVER);
    setShowUsersList(false);
    if (isMobile) setIsSidebarOpen(false);
  }, [directMessages, isMobile]);

  const updateLastMessage = useCallback((conversationId: string, content: string) => {
    setDirectMessages(prev =>
      prev.map(dm =>
        dm.id === conversationId
          ? { ...dm, lastMessage: truncatePreview(content || 'Sent an attachment') }
          : dm
      )
    );
  }, []);

  const handleSendMessage = useCallback((
    content: string,
    attachments?: MessageAttachment[],
    replyTo?: MessageReplyRef
  ) => {
    const preview = content || (attachments?.[0]?.name ?? 'Attachment');
    const newMsg: Message = {
      id: `m${Date.now()}`,
      userId: 'me',
      username: 'You',
      content,
      timestamp: 'Just now',
      attachments,
      replyTo,
    };

    setMessagesByConversation(prev => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] ?? []), newMsg],
    }));

    if (activeConversation.type === 'dm') {
      updateLastMessage(activeConversation.id, preview);
    }
  }, [activeConversation, updateLastMessage]);

  const handleAddReaction = useCallback((messageId: string, emoji: string) => {
    setMessagesByConversation(prev => {
      const msgs = prev[activeConversation.id] ?? [];
      return {
        ...prev,
        [activeConversation.id]: msgs.map(msg => {
          if (msg.id !== messageId) return msg;
          const reactions = [...(msg.reactions ?? [])];
          const idx = reactions.findIndex(r => r.emoji === emoji);
          if (idx >= 0) {
            const existing = reactions[idx];
            if (existing.reactedByMe) {
              if (existing.count <= 1) reactions.splice(idx, 1);
              else reactions[idx] = { ...existing, count: existing.count - 1, reactedByMe: false };
            } else {
              reactions[idx] = { ...existing, count: existing.count + 1, reactedByMe: true };
            }
          } else {
            reactions.push({ emoji, count: 1, reactedByMe: true });
          }
          return { ...msg, reactions };
        }),
      };
    });
  }, [activeConversation.id]);

  const sidebarProps = {
    activeServer,
    channels: CHANNELS,
    directMessages,
    activeChannelId: activeConversation.id,
    onChannelSelect: handleConversationSelect,
    onStartDm: () => setShowUsersList(true),
  };

  return (
    <div className="fixed inset-0 flex bg-white overflow-hidden font-sans selection:bg-primary-100 selection:text-primary-900">

      {!isMobile && (
        <>
          <ServerRail
            servers={servers}
            activeServerId={activeServer.id}
            onServerSelect={handleServerSelect}
            onAddServer={() => setShowCreateModal(true)}
            onBack={() => navigate(-1)}
            dmHomeServer={DM_HOME_SERVER}
          />
          <ChannelSidebar {...sidebarProps} />
        </>
      )}

      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 flex z-[101] shadow-2xl max-w-[calc(100vw-48px)]"
            >
              <ServerRail
                servers={servers}
                activeServerId={activeServer.id}
                onServerSelect={handleServerSelect}
                onAddServer={() => setShowCreateModal(true)}
                onBack={() => navigate(-1)}
                dmHomeServer={DM_HOME_SERVER}
              />
              <ChannelSidebar {...sidebarProps} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ChatContent
        activeChannel={activeConversation}
        messages={currentMessages}
        onSendMessage={handleSendMessage}
        onAddReaction={handleAddReaction}
        toggleMembers={() => setShowUsersList(prev => !prev)}
        toggleSidebar={() => setIsSidebarOpen(true)}
        typingUsers={typingUsersForChannel}
      />

      <MemberSidebar
        isVisible={showUsersList}
        users={CHAT_USERS}
        onUserSelect={openDmWithUser}
        onClose={() => setShowUsersList(false)}
        isMobile={isMobile}
      />

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
