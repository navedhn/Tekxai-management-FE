import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hash, Volume2, Search, Phone, Video, Pin, Users as UsersIcon, Gift, Smile, Paperclip, Send, Menu } from 'lucide-react';
import { Channel, Message, getAvatarColor, getInitials } from '../chatTypes';

interface ChatContentProps {
  activeChannel: Channel;
  messages: Message[];
  onSendMessage: (content: string) => void;
  toggleMembers: () => void;
  toggleSidebar?: () => void; // New for mobile responsiveness
}

const ChatContent: React.FC<ChatContentProps> = ({ activeChannel, messages, onSendMessage, toggleMembers, toggleSidebar }) => {
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
      {/* Chat Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 shadow-sm flex-shrink-0 bg-white z-10">
        <div className="flex items-center gap-2">
          {/* Mobile Menu Trigger */}
          <button 
            onClick={toggleSidebar}
            className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 mr-1"
          >
            <Menu size={20} />
          </button>

          {activeChannel.type === 'text' ? (
            <Hash size={20} className="text-gray-400" />
          ) : (
            <Volume2 size={20} className="text-gray-400" />
          )}
          <h3 className="font-black text-gray-800 text-sm">{activeChannel.name}</h3>
          
          <div className="hidden sm:block w-px h-5 bg-gray-200 mx-2" />
          <p className="hidden md:block text-xs text-gray-400 font-medium truncate">
            {activeChannel.type === 'text' ? `Welcome to #${activeChannel.name}!` : 'Voice connection ready'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <Phone size={18} />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <Video size={18} />
          </button>
          <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <Pin size={18} className="rotate-45" />
          </button>
          <button 
            onClick={toggleMembers}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors hidden sm:flex"
          >
            <UsersIcon size={18} />
          </button>
          
          <div className="relative hidden lg:block">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search" 
              className="bg-gray-100 border-none rounded-lg py-1 pl-8 pr-3 text-xs font-medium w-36 focus:ring-1 focus:ring-primary-100 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
        {/* Welcome Banner */}
        <div className="flex flex-col items-start gap-2 pb-4 border-b border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#005CDA] to-[#001F4A] flex items-center justify-center shadow-lg">
            <Hash size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Welcome to #{activeChannel.name}!</h2>
          <p className="text-sm text-gray-500 font-medium">
            This is the start of the #{activeChannel.name} channel.
          </p>
        </div>

        {/* Message List */}
        {messages.map((msg, idx) => {
          const prevMsg = messages[idx - 1];
          const isGrouped = prevMsg?.userId === msg.userId && !msg.isBot;
          const avatarColor = getAvatarColor(msg.username);

          return (
            <motion.div
              layout
              key={msg.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex gap-3 group hover:bg-gray-50 transition-colors rounded-xl px-2 py-1 -mx-2 ${isGrouped ? 'mt-0.5' : 'mt-4'}`}
            >
              <div className="w-10 flex-shrink-0 flex justify-center">
                {isGrouped ? (
                  <span className="text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                    {msg.timestamp.split(' ').slice(-2).join(' ')}
                  </span>
                ) : (
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-b ${avatarColor} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                    {getInitials(msg.username)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {!isGrouped && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-sm font-black text-gray-800 hover:underline cursor-pointer">{msg.username}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{msg.timestamp}</span>
                  </div>
                )}
                <p className="text-sm text-gray-700 font-medium leading-relaxed break-words">{msg.content}</p>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="px-4 pb-4 pt-2 bg-white flex-shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5 border border-gray-200 focus-within:border-[#005CDA]/40 focus-within:ring-2 focus-within:ring-[#005CDA]/10 transition-all shadow-sm">
          <button className="p-1 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0 grayscale hover:grayscale-0">
            <Paperclip size={18} className="text-gray-400" />
          </button>
          
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            type="text"
            placeholder={`Message #${activeChannel.name}`}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 font-medium focus:outline-none"
          />

          <div className="flex items-center gap-1">
            <button className="hidden sm:flex p-1 hover:bg-gray-200 rounded-lg transition-colors grayscale hover:grayscale-0">
              <Gift size={18} className="text-gray-400" />
            </button>
            <button className="p-1 hover:bg-gray-200 rounded-lg transition-colors grayscale hover:grayscale-0">
              <Smile size={18} className="text-gray-400" />
            </button>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="ml-1 p-2 bg-gradient-to-b from-[#005CDA] to-[#001F4A] hover:opacity-90 text-white rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-md shadow-primary-100"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatContent;
