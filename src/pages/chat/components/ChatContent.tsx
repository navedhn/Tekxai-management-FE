import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hash, Volume2, Smile, Plus, Send, Menu, Users as UsersIcon,
  FileText, X, Search, Pin, Bell, Reply, MoreHorizontal,
} from 'lucide-react';
import {
  Channel, Message, MessageAttachment, MessageReplyRef,
  EMOJI_LIST, QUICK_REACTIONS,
  getAvatarColor, getInitials, getStatusColor, formatFileSize,
} from '../chatTypes';
import { getDateLabel, shouldShowDateDivider } from '../chatUtils';

interface ChatContentProps {
  activeChannel: Channel;
  messages: Message[];
  onSendMessage: (content: string, attachments?: MessageAttachment[], replyTo?: MessageReplyRef) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  toggleMembers: () => void;
  toggleSidebar?: () => void;
  typingUsers?: string[];
}

const DateDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 my-4 px-2">
    <div className="flex-1 h-px bg-gray-200" />
    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
    <div className="flex-1 h-px bg-gray-200" />
  </div>
);

const ChatContent: React.FC<ChatContentProps> = ({
  activeChannel,
  messages,
  onSendMessage,
  onAddReaction,
  toggleMembers,
  toggleSidebar,
  typingUsers = [],
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [replyingTo, setReplyingTo] = useState<MessageReplyRef | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDm = activeChannel.type === 'dm';
  const isVoice = activeChannel.type === 'voice';
  const displayName = isDm ? (activeChannel.recipientName || activeChannel.name) : activeChannel.name;

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel.id]);

  useEffect(() => {
    setInputValue('');
    setPendingAttachments([]);
    setShowEmojiPicker(false);
    setReplyingTo(null);
    setSearchQuery('');
    setShowSearch(false);
  }, [activeChannel.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() && pendingAttachments.length === 0) return;
    onSendMessage(
      inputValue.trim(),
      pendingAttachments.length > 0 ? pendingAttachments : undefined,
      replyingTo ?? undefined
    );
    setInputValue('');
    setPendingAttachments([]);
    setShowEmojiPicker(false);
    setReplyingTo(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [inputValue, pendingAttachments, replyingTo, onSendMessage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newAttachments: MessageAttachment[] = Array.from(files).map(file => ({
      type: file.type.startsWith('image/') ? 'image' : 'file',
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
    }));
    setPendingAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => {
      const removed = prev[index];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const insertEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const renderReactions = (msg: Message) => {
    if (!msg.reactions?.length) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {msg.reactions.map((r, i) => (
          <button
            key={i}
            onClick={() => onAddReaction(msg.id, r.emoji)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
              r.reactedByMe
                ? 'bg-[#E8EEF8] border-[#005CDA]/30 text-[#005CDA]'
                : 'bg-gray-100 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <span>{r.emoji}</span>
            <span className="font-semibold text-[11px]">{r.count}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderMessageContent = (msg: Message) => (
    <>
      {msg.replyTo && (
        <div className="flex items-center gap-2 mb-1 pl-2 border-l-2 border-[#005CDA]/40 text-xs text-gray-400">
          <Reply size={12} className="flex-shrink-0" />
          <span className="font-semibold text-gray-500">{msg.replyTo.username}</span>
          <span className="truncate">{msg.replyTo.content}</span>
        </div>
      )}
      {msg.content && (
        <p className="text-[15px] text-gray-800 leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
      )}
      {msg.attachments && msg.attachments.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${msg.content ? 'mt-2' : ''}`}>
          {msg.attachments.map((att, i) =>
            att.type === 'image' ? (
              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block max-w-sm">
                <img src={att.url} alt={att.name} className="rounded-lg max-h-64 object-cover border border-gray-200 hover:opacity-90 transition-opacity" />
              </a>
            ) : (
              <a
                key={i}
                href={att.url}
                download={att.name}
                className="flex items-center gap-2 px-3 py-2.5 bg-[#F2F3F5] hover:bg-[#E3E5E8] rounded-lg border border-gray-200 transition-colors max-w-xs"
              >
                <FileText size={20} className="text-[#005CDA] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{att.name}</p>
                  {att.size && <p className="text-[11px] text-gray-400">{formatFileSize(att.size)}</p>}
                </div>
              </a>
            )
          )}
        </div>
      )}
      {renderReactions(msg)}
    </>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
      {/* Header */}
      <div className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-[#E3E5E8] flex-shrink-0 bg-white z-10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-500 flex-shrink-0"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          {isDm ? (
            <div className="relative flex-shrink-0">
              <div className={`w-7 h-7 rounded-full bg-gradient-to-b ${getAvatarColor(displayName)} flex items-center justify-center text-white text-[9px] font-black`}>
                {getInitials(displayName)}
              </div>
              {activeChannel.recipientStatus && (
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(activeChannel.recipientStatus)}`} />
              )}
            </div>
          ) : isVoice ? (
            <Volume2 size={20} className="text-gray-500 flex-shrink-0" />
          ) : (
            <Hash size={20} className="text-gray-500 flex-shrink-0" />
          )}

          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-[15px] truncate leading-tight">{displayName}</h3>
            {isDm && activeChannel.recipientStatus && (
              <p className="text-[11px] text-gray-400 capitalize hidden sm:block leading-tight">
                {activeChannel.recipientStatus === 'dnd' ? 'Do Not Disturb' : activeChannel.recipientStatus}
              </p>
            )}
          </div>

          {!isDm && !isVoice && (
            <>
              <div className="hidden sm:block w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />
              <p className="hidden lg:block text-xs text-gray-400 truncate">
                Channel for team discussion
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          <button
            onClick={() => setShowSearch(v => !v)}
            className={`p-2 rounded transition-colors ${showSearch ? 'text-[#005CDA] bg-[#E8EEF8]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
            title="Search"
          >
            <Search size={18} />
          </button>
          <button className="hidden sm:flex p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors" title="Pinned Messages">
            <Pin size={18} />
          </button>
          <button className="hidden sm:flex p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors" title="Notifications">
            <Bell size={18} />
          </button>
          <button
            onClick={toggleMembers}
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="Members"
          >
            <UsersIcon size={18} />
          </button>
        </div>
      </div>

      {/* Inline search */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-200 overflow-hidden flex-shrink-0"
          >
            <div className="px-4 py-2 flex items-center gap-2">
              <Search size={16} className="text-gray-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search in ${isDm ? displayName : `#${activeChannel.name}`}`}
                className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder:text-gray-400"
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 no-scrollbar">
        {isVoice ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
            <div className="w-20 h-20 rounded-full bg-[#F2F3F5] flex items-center justify-center">
              <Volume2 size={36} className="text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{activeChannel.name}</h2>
              <p className="text-sm text-gray-500 mt-1">No one is currently in this voice channel</p>
            </div>
            <button className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-full transition-colors">
              Join Voice
            </button>
          </div>
        ) : (
          <>
            {/* Welcome banner */}
            <div className="pt-4 pb-2 mb-2">
              {isDm ? (
                <div className="flex items-end gap-3">
                  <div className={`w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full bg-gradient-to-b ${getAvatarColor(displayName)} flex items-center justify-center text-white text-xl font-black shadow-md flex-shrink-0`}>
                    {getInitials(displayName)}
                  </div>
                  <div className="pb-1">
                    <h2 className="text-2xl sm:text-[32px] font-bold text-gray-900 leading-tight">{displayName}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      This is the beginning of your direct message history with <strong>{displayName}</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-3">
                  <div className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full bg-[#F2F3F5] flex items-center justify-center flex-shrink-0">
                    <Hash size={36} className="text-gray-400" />
                  </div>
                  <div className="pb-1">
                    <h2 className="text-2xl sm:text-[32px] font-bold text-gray-900 leading-tight">Welcome to #{activeChannel.name}!</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      This is the start of the <strong>#{activeChannel.name}</strong> channel.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {filteredMessages.map((msg, idx) => {
              const prevMsg = filteredMessages[idx - 1];
              const isGrouped = prevMsg?.userId === msg.userId && !msg.isBot && !shouldShowDateDivider(prevMsg, msg);
              const showDate = shouldShowDateDivider(prevMsg, msg);
              const avatarColor = getAvatarColor(msg.username);

              return (
                <React.Fragment key={msg.id}>
                  {showDate && <DateDivider label={getDateLabel(msg.timestamp)} />}
                  <div
                    className={`relative flex gap-3 sm:gap-4 group px-2 -mx-2 rounded hover:bg-[#F2F3F5]/80 transition-colors ${
                      isGrouped ? 'py-0.5 mt-0' : 'py-1 mt-[17px]'
                    }`}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                  >
                    {/* Hover toolbar */}
                    <AnimatePresence>
                      {hoveredMsgId === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute -top-3 right-2 flex items-center bg-white border border-gray-200 rounded-md shadow-md overflow-hidden z-10"
                        >
                          {QUICK_REACTIONS.slice(0, 4).map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => onAddReaction(msg.id, emoji)}
                              className="px-1.5 py-1 hover:bg-gray-100 text-sm transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            onClick={() => setReplyingTo({ id: msg.id, username: msg.username, content: msg.content || 'Attachment' })}
                            className="p-1.5 hover:bg-gray-100 text-gray-500 border-l border-gray-200"
                            title="Reply"
                          >
                            <Reply size={14} />
                          </button>
                          <button className="p-1.5 hover:bg-gray-100 text-gray-500 border-l border-gray-200" title="More">
                            <MoreHorizontal size={14} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="w-10 flex-shrink-0">
                      {isGrouped ? (
                        <span className="text-[11px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity leading-[22px] pl-1">
                          {msg.timestamp.split(' at ')[1] || msg.timestamp}
                        </span>
                      ) : (
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-b ${avatarColor} flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:opacity-90`}>
                          {getInitials(msg.username)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      {!isGrouped && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-[15px] font-semibold text-gray-900 hover:underline cursor-pointer">{msg.username}</span>
                          <span className="text-[11px] text-gray-400">{msg.timestamp}</span>
                        </div>
                      )}
                      {renderMessageContent(msg)}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500">
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span>
              <strong className="text-gray-700">{typingUsers.join(', ')}</strong>
              {typingUsers.length === 1 ? ' is' : ' are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input area */}
      {!isVoice && (
        <div className="px-3 sm:px-4 pb-4 pt-1 flex-shrink-0">
          {/* Reply bar */}
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-1 flex items-center gap-2 px-3 py-2 bg-[#F2F3F5] rounded-t-lg border border-b-0 border-gray-200"
              >
                <Reply size={14} className="text-[#005CDA] flex-shrink-0" />
                <div className="flex-1 min-w-0 text-xs">
                  <span className="font-semibold text-[#005CDA]">Replying to {replyingTo.username}</span>
                  <p className="text-gray-500 truncate">{replyingTo.content}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pending attachments */}
          <AnimatePresence>
            {pendingAttachments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-1 flex flex-wrap gap-2 px-1"
              >
                {pendingAttachments.map((att, i) => (
                  <div key={i} className="relative group">
                    {att.type === 'image' ? (
                      <img src={att.url} alt={att.name} className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#F2F3F5] rounded-lg border border-gray-200">
                        <FileText size={14} className="text-[#005CDA]" />
                        <span className="text-xs font-medium text-gray-700 max-w-[80px] truncate">{att.name}</span>
                      </div>
                    )}
                    <button
                      onClick={() => removePendingAttachment(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center shadow-sm"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Discord-style input */}
          <div className={`relative flex items-center gap-1 bg-[#F2F3F5] rounded-lg px-3 py-2 border border-transparent focus-within:border-gray-300 transition-colors ${replyingTo ? 'rounded-t-none' : ''}`}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.zip"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="Upload file"
            >
              <Plus size={22} />
            </button>

            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaInput}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder={isDm ? `Message @${displayName}` : `Message #${activeChannel.name}`}
              className="flex-1 min-w-0 bg-transparent text-[15px] text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none leading-[22px] max-h-[120px] py-0 my-0 align-middle"
            />

            <div className="flex items-center gap-1 shrink-0 relative self-center">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(v => !v)}
                className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${showEmojiPicker ? 'text-[#005CDA]' : 'text-gray-500 hover:text-gray-800'}`}
                aria-label="Emoji"
              >
                <Smile size={22} />
              </button>

              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    ref={emojiPickerRef}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute bottom-full right-0 mb-2 w-[min(300px,calc(100vw-2rem))] bg-white rounded-lg shadow-2xl border border-gray-200 p-3 z-50"
                  >
                    <p className="text-[11px] font-bold text-gray-400 uppercase mb-2">Frequently Used</p>
                    <div className="grid grid-cols-8 gap-0.5 mb-3">
                      {EMOJI_LIST.slice(0, 16).map(emoji => (
                        <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded transition-colors">
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mb-2">Smileys</p>
                    <div className="grid grid-cols-8 gap-0.5 max-h-32 overflow-y-auto no-scrollbar">
                      {EMOJI_LIST.slice(16).map(emoji => (
                        <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded transition-colors">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {(inputValue.trim() || pendingAttachments.length > 0) && (
                <button
                  type="button"
                  onClick={handleSend}
                  className="flex h-6 w-6 items-center justify-center text-[#005CDA] hover:text-[#0047AB] transition-colors"
                  aria-label="Send"
                >
                  <Send size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContent;
