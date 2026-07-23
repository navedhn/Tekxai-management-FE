import React, { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useChatUnreadCount } from '@/hooks/useChatUnreadCount';
import { useToastContext } from '@/components/toast/ToastProvider';

const ChatFloatingButton: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const unreadCount = useChatUnreadCount();
    const toast = useToastContext();
    // This component is mounted exactly once per active layout (admin/hr/
    // employee), and exactly one layout is ever mounted at a time — so this
    // is the single place the unread total is diffed and surfaced, rather
    // than duplicating the effect in every consumer of useChatUnreadCount
    // (e.g. the sidebar badge, which only displays the number).
    const prevCount = useRef<number | null>(null);

    useEffect(() => {
        if (prevCount.current !== null && unreadCount > prevCount.current) {
            const delta = unreadCount - prevCount.current;
            const body = `You have ${delta} new message${delta === 1 ? '' : 's'}`;
            toast.info(body);
            if (typeof Notification !== 'undefined') {
                if (Notification.permission === 'granted') {
                    new Notification('New chat message', { body, icon: '/favicon.ico' });
                } else if (Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            }
        }
        prevCount.current = unreadCount;
    }, [unreadCount]);

    const isOnChat = location.pathname === '/chat';

    // Hide the floating button when already on the chat page
    if (isOnChat) return null;

    return (
        <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => navigate('/chat')}
            title="Open Chat"
            className={cn(
                'fixed bottom-6 right-6 z-[9998]',
                'w-14 h-14 rounded-full',
                'bg-gradient-to-b from-[#005CDA] to-[#001F4A]',
                'text-white shadow-xl shadow-blue-400/30',
                'flex items-center justify-center',
                'ring-4 ring-white/20',
                'transition-shadow duration-300 hover:shadow-2xl hover:shadow-blue-500/40'
            )}
        >
            <MessageSquare size={22} />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping bg-[#005CDA]/30 pointer-events-none" />
        </motion.button>
    );
};

export default ChatFloatingButton;
