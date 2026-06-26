import React, { useRef, useEffect } from 'react';
import { Megaphone, Briefcase, Bell } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotifications, useMarkAllRead, useMarkRead, timeAgo } from '@/services/notificationService';

function iconFor(type: string | null) {
  if (!type) return Briefcase;
  const t = type.toLowerCase();
  if (t.includes('alert') || t.includes('reminder') || t.includes('warning')) return Megaphone;
  return Briefcase;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const NotificationDropdown: React.FC<Props> = ({ isOpen, onClose, triggerRef }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate    = useNavigate();
  const location    = useLocation();

  const { data, isLoading } = useNotifications(10);
  const markAll = useMarkAllRead();
  const markOne = useMarkRead();

  const notifications = data?.records ?? [];
  const unread = data?.unread_count ?? 0;

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
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleSeeAll = () => {
    onClose();
    navigate(location.pathname.startsWith('/admin') ? '/admin/notifications' : '/employee/notifications');
  };

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'absolute right-0 sm:right-6 top-[4.5rem] w-full sm:w-[420px] bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200',
        'max-sm:fixed max-sm:top-[5.5rem] max-sm:rounded-none max-sm:border-x-0 max-sm:max-h-[calc(100vh-5.5rem)]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-black text-gray-900">Notifications</span>
          {unread > 0 && (
            <span className="text-xs font-bold bg-primary-500 text-white rounded-full px-1.5 py-0.5">{unread}</span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="text-xs font-bold text-primary-600 hover:underline disabled:opacity-50"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex flex-col max-h-[60vh] sm:max-h-[460px] overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={cn('flex items-start gap-3 p-4 animate-pulse', i < 3 && 'border-b border-gray-100')}>
                <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-gray-100 rounded w-2/5" />
                  <div className="h-3 bg-gray-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-gray-400">
            <Bell size={32} strokeWidth={1.5} />
            <p className="text-xs font-semibold">No notifications</p>
          </div>
        ) : (
          <div className="flex flex-col pb-2">
            {notifications.map((notif, index) => {
              const Icon = iconFor(notif.type);
              return (
                <div
                  key={notif.id}
                  onClick={() => { if (!notif.is_read) markOne.mutate(notif.id); }}
                  className={cn(
                    'flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer',
                    !notif.is_read && 'bg-[#F5F8FF]/60',
                    index !== notifications.length - 1 && 'border-b border-gray-100'
                  )}
                >
                  <div className="shrink-0 h-10 w-10 rounded-full bg-[#F5F8FF] text-primary-500 flex items-center justify-center">
                    <Icon size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col flex-1 gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-[14px] font-black text-gray-900 tracking-tight">{notif.title}</h4>
                      <span className="shrink-0 text-xs text-gray-400 font-medium">{timeAgo(notif.created_at)}</span>
                    </div>
                    <p className="text-[13px] leading-snug text-gray-600 font-medium tracking-tight pr-5 relative">
                      {notif.body}
                      {!notif.is_read && (
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(0,92,218,0.4)]" />
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        onClick={handleSeeAll}
        className="p-4 border-t border-gray-100 bg-[#F5F8FF] flex items-center justify-center cursor-pointer hover:bg-primary-50 transition-colors"
      >
        <span className="text-[15px] font-bold text-primary-600">See All Notifications</span>
      </div>
    </div>
  );
};

export default NotificationDropdown;
