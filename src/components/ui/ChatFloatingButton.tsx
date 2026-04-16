import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

const ChatFloatingButton: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

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
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping bg-[#005CDA]/30 pointer-events-none" />
        </motion.button>
    );
};

export default ChatFloatingButton;
