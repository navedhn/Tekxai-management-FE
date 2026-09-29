import React from 'react';
import Card from '@/components/ui/Card';
import { Bell, Trash2, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotifications, useMarkAllRead, useMarkRead, useDeleteNotification, timeAgo, type Notification } from '@/services/notificationService';
import {
  notificationBody,
  notificationIconFor,
  resolveNotificationDestination,
} from '@/utils/notificationNavigation';
import { useToastContext } from '@/components/toast/ToastProvider';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastContext();
  const { data, isLoading } = useNotifications(50);
  const markAll  = useMarkAllRead();
  const markOne  = useMarkRead();
  const del      = useDeleteNotification();

  const notifications = data?.records ?? [];
  const unread = data?.unread_count ?? 0;

  const openNotification = (notif: Notification) => {
    if (!notif.is_read) markOne.mutate(notif.id);
    const dest = resolveNotificationDestination(notif, location.pathname);
    if (!dest) {
      toast.info('This notification has no linked page, or the destination is no longer available.');
      return;
    }
    navigate(dest);
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center justify-between pb-2 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-black text-(--color-text-primary) tracking-tight truncate">Notifications</h1>
          {unread > 0 && (
            <span className="text-xs font-bold bg-primary-500 text-white rounded-full px-2 py-0.5 shrink-0">
              {unread} new
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="text-sm font-bold text-primary-600 hover:text-primary-700 hover:underline transition-colors focus:outline-none disabled:opacity-50 shrink-0"
          >
            Mark all as read
          </button>
        )}
      </div>

      <Card className="bg-(--color-card-bg) border border-(--color-card-border) shadow-sm overflow-hidden p-0">
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cn('flex items-start gap-4 p-6 animate-pulse', i < 4 && 'border-b border-(--color-card-border)')}>
                <div className="w-11 h-11 rounded-full bg-(--color-elevated) shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-(--color-elevated) rounded w-1/3" />
                  <div className="h-3 bg-(--color-elevated) rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-(--color-text-secondary)">
            <Bell size={40} strokeWidth={1.5} />
            <p className="font-semibold text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((notif, index) => {
              const Icon = notificationIconFor(notif.type);
              const dest = resolveNotificationDestination(notif, location.pathname);
              return (
                <div
                  key={notif.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'group flex justify-between items-start p-4 sm:p-6 hover:bg-(--color-state-hover) transition-colors cursor-pointer',
                    !notif.is_read && 'bg-(--color-state-selected)',
                    index !== notifications.length - 1 && 'border-b border-(--color-card-border)'
                  )}
                  onClick={() => openNotification(notif)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openNotification(notif);
                    }
                  }}
                >
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="shrink-0 h-11 w-11 rounded-full bg-(--color-info-bg) text-primary-500 flex items-center justify-center mt-1">
                      <Icon size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-2">
                      <div className="flex items-start gap-3 flex-wrap">
                        <h4 className="text-[15px] font-black text-(--color-text-primary) tracking-tight break-words">{notif.title}</h4>
                        <span className="text-[13px] text-(--color-text-secondary) font-medium shrink-0">{timeAgo(notif.created_at)}</span>
                      </div>
                      <p className="text-[14px] leading-relaxed text-(--color-text-secondary) font-medium tracking-tight break-words">
                        {notificationBody(notif)}
                      </p>
                      {dest && (
                        <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-primary-600">
                          Open related item <ChevronRight size={14} />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
                    {!notif.is_read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(0,92,218,0.4)] block" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); del.mutate(notif.id); }}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-(--color-text-secondary) hover:text-red-500 p-2 -m-1"
                      title="Delete"
                      aria-label="Delete notification"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;
