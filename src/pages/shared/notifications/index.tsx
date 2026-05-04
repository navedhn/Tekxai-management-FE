import React from 'react';
import Card from '@/components/ui/Card';
import { Megaphone, Briefcase, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';

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
    title: 'Welcome to the Tekxai',
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
    isUnread: false,
  },
  {
    id: 'n5',
    title: 'Daily limit almost reached',
    time: '5 hours ago',
    description: "You're close to today's working hour limit. Please wrap up or check out as needed.",
    iconType: 'megaphone',
    isUnread: false,
  },
  {
    id: 'n6',
    title: 'Welcome to the Tekxai',
    time: '4 hours ago',
    description: 'You\'re all set. Start tracking your time by checking in from your dashboard.',
    iconType: 'briefcase',
    isUnread: true,
  },
  {
    id: 'n7',
    title: 'Daily limit almost reached',
    time: '5 hours ago',
    description: "You're close to today's working hour limit. Please wrap up or check out as needed.",
    iconType: 'megaphone',
    isUnread: false,
  },
  {
    id: 'n8',
    title: 'You forgot to check out',
    time: '4 hours ago',
    description: 'You\'re still checked in. Please check out to ensure your time is recorded correctly.',
    iconType: 'megaphone',
    isUnread: false,
  },
];

const NotificationsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Notifications & Logs</h1>
        <button className="text-sm font-bold text-primary-600 hover:text-primary-700 hover:underline transition-colors focus:outline-none">
          Mark all as read
        </button>
      </div>

      <Card className="bg-white border-none shadow-sm overflow-hidden p-0">
        <div className="flex flex-col">
          {mockNotifications.map((notif, index) => {
            const Icon = notif.iconType === 'briefcase' ? Briefcase : Megaphone;
            return (
              <div
                key={notif.id}
                className={cn(
                  "flex justify-between items-start p-6 hover:bg-gray-50 transition-colors",
                  index !== mockNotifications.length - 1 && "border-b border-gray-100"
                )}
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Icon Container */}
                  <div className="shrink-0 h-11 w-11 rounded-full bg-[#F5F8FF] text-primary-500 flex items-center justify-center mt-1">
                    <Icon size={20} strokeWidth={2.5} />
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-1.5 flex-1 pr-6">
                    <div className="flex items-center gap-3">
                      <h4 className="text-[15px] font-black text-gray-900 tracking-tight">{notif.title}</h4>
                      <span className="text-[13px] text-gray-500 font-bold">{notif.time}</span>
                    </div>
                    <p className="text-[14px] leading-relaxed text-gray-600 font-medium tracking-tight">
                      {notif.description}
                    </p>
                  </div>
                </div>

                {/* Right Status Region */}
                <div className="flex flex-col items-end gap-2 shrink-0 h-full pt-1">
                  {notif.isUnread ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(0,92,218,0.4)] block mb-1" />
                  ) : (
                    <div className="w-2.5 h-2.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <CheckCircle2 size={16} className="text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default NotificationsPage;
