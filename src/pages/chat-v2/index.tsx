import React, { useState, useRef, useEffect } from 'react';
import { Hash, Send, Plus, Smile, MessageSquare } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useGetChannels, useGetMessages, useSendMessage, useJoinChannel, useCreateChannel, type Channel, type Message } from '@/services/chatService';
import { useAuth } from '@/hooks/useAuth';
import { useToastContext } from '@/components/toast/ToastProvider';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

const REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '✅'];

const ChatApp: React.FC = () => {
  const { user } = useAuth();
  const toast = useToastContext();
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: channels = [], isLoading: cLoading } = useGetChannels();
  const { data: messages = [], isLoading: mLoading } = useGetMessages(activeChannel || '', !!activeChannel);
  const sendMsg = useSendMessage(activeChannel || '');
  const joinChannel = useJoinChannel(activeChannel || '');
  const createChannel = useCreateChannel();

  useEffect(() => {
    if (channels.length > 0 && !activeChannel) setActiveChannel(channels[0].id);
  }, [channels]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activeChannel) return;
    try {
      await sendMsg.mutateAsync(draft.trim());
      setDraft('');
    } catch { toast.error('Failed to send message'); }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      await createChannel.mutateAsync({ name: newChannelName.toLowerCase().replace(/\s+/g, '-'), type: 'PUBLIC' });
      toast.success(`#${newChannelName} created`);
      setShowNewChannel(false);
      setNewChannelName('');
    } catch { toast.error('Failed to create channel'); }
  };

  const activeChannelData = channels.find(c => c.id === activeChannel);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div className="w-60 flex-shrink-0 bg-gray-900 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-700">
          <h2 className="font-black text-white text-sm">Tekxai Workspace</h2>
          <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          <div className="px-3 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Channels</span>
            <button onClick={() => setShowNewChannel(true)}
              className="text-gray-400 hover:text-white transition-colors"><Plus size={14} /></button>
          </div>

          {cLoading ? (
            <div className="px-4 py-2 text-gray-400 text-xs">Loading...</div>
          ) : channels.map(ch => (
            <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
              className={cn('w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors',
                activeChannel === ch.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800')}>
              <Hash size={14} />
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-3.5 border-b border-gray-100">
          <Hash size={18} className="text-gray-400" />
          <h2 className="font-black text-gray-900">{activeChannelData?.name || 'Select a channel'}</h2>
          {activeChannelData?.description && (
            <span className="text-sm text-gray-400 font-medium">{activeChannelData.description}</span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {mLoading ? (
            <div className="text-center py-10 text-gray-400">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center gap-3">
              <MessageSquare size={48} className="text-gray-200" />
              <p className="font-bold text-gray-400">No messages yet</p>
              <p className="text-sm text-gray-300">Be the first to say something!</p>
            </div>
          ) : messages.map((msg: Message) => (
            <div key={msg.id} className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-black text-sm flex-shrink-0">
                {msg.user?.first_name?.[0]}{msg.user?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-gray-900 text-sm">{msg.user?.first_name} {msg.user?.last_name}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{msg.content}</p>
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {Object.entries(msg.reactions.reduce((acc: any, r: any) => {
                      acc[r.emoji] = (acc[r.emoji] || []);
                      acc[r.emoji].push(r.user?.first_name);
                      return acc;
                    }, {})).map(([emoji, users]: any) => (
                      <span key={emoji} className="bg-gray-100 text-xs px-2 py-0.5 rounded-full font-medium">
                        {emoji} {users.length}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        {activeChannel && (
          <form onSubmit={handleSend} className="px-6 py-4 border-t border-gray-100">
            <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-2.5">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Message #${activeChannelData?.name || '...'}`}
                className="flex-1 bg-transparent text-sm font-medium placeholder:text-gray-400 outline-none"
              />
              <button type="submit" disabled={!draft.trim() || sendMsg.isPending}
                className="p-1.5 text-primary-600 hover:text-primary-700 disabled:opacity-40 transition-colors">
                <Send size={18} />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* New Channel Modal */}
      <Modal isOpen={showNewChannel} onClose={() => setShowNewChannel(false)} title="Create Channel">
        <form onSubmit={handleCreateChannel} className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase">Channel Name</label>
            <input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="e.g. frontend-dev"
              className="h-11 px-4 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" fullWidth onClick={() => setShowNewChannel(false)}>Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={createChannel.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ChatApp;
