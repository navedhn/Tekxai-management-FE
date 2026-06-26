import React from 'react';
import Card from '@/components/ui/Card';
import { Bell, Megaphone, Briefcase, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useNotifications, useMarkAllRead, useMarkRead, useDeleteNotification, timeAgo } from '@/services/notificationService';

function iconFor(type: string | null) {
  if (!type) return Briefcase;
  const t = type.toLowerCase();
  if (t.includes('alert') || t.includes('reminder') || t.includes('warning')) return Megaphone;
  return Briefcase;
}

const NotificationsPage: React.FC = () => {
  const { data, isLoading } = useNotifications(50);
  const markAll  = useMarkAllRead();
  const markOne  = useMarkRead();
  const del      = useDeleteNotification();

  const notifications = data?.records ?? [];
  const unread = data?.unread_count ?? 0;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Notifications</h1>
          {unread > 0 && (
            <span className="text-xs font-bold bg-primary-500 text-white rounded-full px-2 py-0.5">
              {unread} new
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="text-sm font-bold text-primary-600 hover:text-primary-700 hover:underline transition-colors focus:outline-none disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      <Card className="bg-white border-none shadow-sm overflow-hidden p-0">
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cn('flex items-start gap-4 p-6 animate-pulse', i < 4 && 'border-b border-gray-100')}>
                <div className="w-11 h-11 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Bell size={40} strokeWidth={1.5} />
            <p className="font-semibold text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((notif, index) => {
              const Icon = iconFor(notif.type);
              return (
                <div
                  key={notif.id}
                  className={cn(
                    'group flex justify-between items-start p-6 hover:bg-gray-50 transition-colors',
                    !notif.is_read && 'bg-[#F5F8FF]/60',
                    index !== notifications.length - 1 && 'border-b border-gray-100'
                  )}
                  onClick={() => { if (!notif.is_read) markOne.mutate(notif.id); }}
                  style={{ cursor: notif.is_read ? 'default' : 'pointer' }}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="shrink-0 h-11 w-11 rounded-full bg-[#F5F8FF] text-primary-500 flex items-center justify-center mt-1">
                      <Icon size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 pr-4">
                      <div className="flex items-center gap-3">
                        <h4 className="text-[15px] font-black text-gray-900 tracking-tight">{notif.title}</h4>
                        <span className="text-[13px] text-gray-400 font-medium shrink-0">{timeAgo(notif.created_at)}</span>
                      </div>
                      <p className="text-[14px] leading-relaxed text-gray-600 font-medium tracking-tight">
                        {notif.body}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
                    {!notif.is_read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(0,92,218,0.4)] block" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); del.mutate(notif.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500"
                      title="Delete"
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
