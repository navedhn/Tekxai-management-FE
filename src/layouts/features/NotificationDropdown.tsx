import React, { useRef, useEffect } from 'react';
import { Megaphone, Briefcase, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useNavigate, useLocation } from 'react-router-dom';

interface NotificationItem {
  id: string;
  title: string;
  time: string;
  description: string;
  iconType: 'briefcase' | 'megaphone';
  isUnread: boolean;
}

const mockNotifications: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Your account is ready',
    time: '3 hours ago',
    description: 'Your work account has been created. You can now log in using your email and the credentials shared with you.',
    iconType: 'briefcase',
    isUnread: true,
  },
  {
    id: 'n2',
    title: 'Welcome to the Yodo',
    time: '4 hours ago',
    description: 'You\'re all set. Start tracking your time by checking in from your dashboard.',
    iconType: 'briefcase',
    isUnread: true,
  },
  {
    id: 'n3',
    title: "You're not checked in",
    time: '6 hours ago',
    description: "Looks like you haven't checked in yet today. Don't forget to start your timer when you begin work.",
    iconType: 'megaphone',
    isUnread: true,
  },
  {
    id: 'n4',
    title: 'You forgot to check out',
    time: '4 hours ago',
    description: 'You\'re still checked in. Please check out to ensure your time is recorded correctly.',
    iconType: 'megaphone',
    isUnread: true,
  },
  {
    id: 'n5',
    title: 'Daily limit almost reached',
    time: '5 hours ago',
    description: "You're close to today's working hour limit. Please wrap up or check out as needed.",
    iconType: 'megaphone',
    isUnread: false,
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const NotificationDropdown: React.FC<Props> = ({ isOpen, onClose, triggerRef }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleSeeAll = () => {
    onClose();
    if (location.pathname.startsWith('/admin')) {
        navigate('/admin/notifications');
    } else {
        navigate('/employee/notifications');
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className={cn(
        "absolute right-0 sm:right-6 top-[4.5rem] w-full sm:w-[420px] bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200",
        // Mobile overrides to make it full screen-ish or padded nice
        "max-sm:fixed max-sm:top-[5.5rem] max-sm:rounded-none max-sm:border-x-0 max-sm:max-h-[calc(100vh-5.5rem)]"
      )}
    >
        <div className="flex flex-col max-h-[60vh] sm:max-h-[500px] overflow-y-auto no-scrollbar">
            <div className="flex flex-col pb-2">
                {mockNotifications.map((notif, index) => {
                    const Icon = notif.iconType === 'briefcase' ? Briefcase : Megaphone;
                    return (
                        <div 
                            key={notif.id} 
                            className={cn(
                                "flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer",
                                index !== mockNotifications.length - 1 && "border-b border-gray-100"
                            )}
                        >
                            {/* Icon Container */}
                            <div className="shrink-0 h-10 w-10 rounded-full bg-[#F5F8FF] text-primary-500 flex items-center justify-center">
                                <Icon size={18} strokeWidth={2.5} />
                            </div>

                            {/* Content */}
                            <div className="flex flex-col flex-1 gap-1">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-[14px] font-black text-gray-900 tracking-tight">{notif.title}</h4>
                                    <span className="shrink-0 text-xs text-gray-500 font-medium">{notif.time}</span>
                                </div>
                                <p className="text-[13.5px] leading-snug text-gray-600 font-medium tracking-tight pr-6 relative">
                                    {notif.description}
                                    {/* Unread dot */}
                                    {notif.isUnread && (
                                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(0,92,218,0.4)]" />
                                    )}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        
        {/* Footer Action */}
        <div 
            onClick={handleSeeAll}
            className="p-4 border-t border-gray-100 bg-[#F5F8FF] flex items-center justify-center cursor-pointer hover:bg-primary-50 transition-colors"
        >
            <span className="text-[15px] font-bold text-primary-600 flex items-center gap-1.5">
                See All Notification
            </span>
        </div>
    </div>
  );
};

export default NotificationDropdown;
