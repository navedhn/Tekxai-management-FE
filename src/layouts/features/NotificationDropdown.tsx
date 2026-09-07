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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleSeeAll = () => {
    onClose();
    const workspace = ['/admin'].find((prefix) => location.pathname.startsWith(prefix)) || '/employee';
    navigate(`${workspace}/notifications`);
  };

  return (
    <>
      <div
        className="fixed inset-x-0 top-topbar bottom-0 z-40 bg-black/20 sm:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dropdownRef}
        role="dialog"
        aria-label="Notifications"
        className={cn(
          'z-50 flex flex-col overflow-hidden bg-(--color-card-bg) border border-(--color-card-border) shadow-[0_10px_40px_rgba(0,0,0,0.1)]',
          'fixed inset-x-0 top-topbar w-full max-h-[calc(100dvh-var(--spacing-topbar))] rounded-none border-x-0 pb-[env(safe-area-inset-bottom)]',
          'sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(420px,calc(100vw-1.5rem))] sm:max-h-[min(32rem,calc(100dvh-6.5rem))] sm:rounded-xl sm:border-x sm:pb-0'
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[15px] font-black text-(--color-text-primary) truncate">Notifications</span>
            {unread > 0 && (
              <span className="text-xs font-bold bg-primary-500 text-white rounded-full px-1.5 py-0.5 shrink-0">{unread}</span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="text-xs font-bold text-primary-600 hover:underline disabled:opacity-50 shrink-0"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="flex flex-col">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn('flex items-start gap-3 p-4', i < 3 && 'border-b border-(--color-card-border)')}>
                  <div className="w-10 h-10 rounded-full bg-(--color-elevated) shrink-0" />
                  <div className="flex-1 space-y-2 py-1 min-w-0">
                    <div className="h-3 bg-(--color-elevated) rounded w-2/5" />
                    <div className="h-3 bg-(--color-elevated) rounded w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-(--color-text-secondary)">
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
                      'flex items-start gap-3 sm:gap-4 p-4 hover:bg-(--color-state-hover) cursor-pointer',
                      !notif.is_read && 'bg-(--color-state-selected)',
                      index !== notifications.length - 1 && 'border-b border-(--color-card-border)'
                    )}
                  >
                    <div className="shrink-0 h-10 w-10 rounded-full bg-(--color-info-bg) text-primary-500 flex items-center justify-center">
                      <Icon size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col flex-1 gap-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-[14px] font-black text-(--color-text-primary) tracking-tight min-w-0 break-words">{notif.title}</h4>
                        <span className="shrink-0 text-xs text-(--color-text-secondary) font-medium whitespace-nowrap">{timeAgo(notif.created_at)}</span>
                      </div>
                      <p className="text-[13px] leading-snug text-(--color-text-secondary) font-medium tracking-tight pr-5 relative break-words">
                        {notif.body}
                        {!notif.is_read && (
                          <span className="absolute right-0 top-1.5 w-2 h-2 rounded-full bg-primary-500" />
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSeeAll}
          className="p-4 border-t border-(--color-card-border) bg-(--color-elevated) flex items-center justify-center hover:bg-(--color-state-hover) shrink-0 w-full"
        >
          <span className="text-[15px] font-bold text-primary-600">See All Notifications</span>
        </button>
      </div>
    </>
  );
};

export default NotificationDropdown;
