import React from 'react';

export interface Server {
  id: string;
  name: string;
  abbreviation: string;
  color: string;
  unread?: number;
  hasNotification?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  unread?: number;
}

export interface Message {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  timestamp: string;
  isBot?: boolean;
}

export interface ChatUser {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  avatar?: string;
}

// --- Static Data ---

export const SERVERS: Server[] = [
  { id: 's1', name: 'Tekxai HQ', abbreviation: 'TX', color: 'from-[#005CDA] to-[#001F4A]' },
  { id: 's2', name: 'Development', abbreviation: 'DV', color: 'from-emerald-500 to-emerald-700' },
  { id: 's3', name: 'Design Team', abbreviation: 'DT', color: 'from-violet-500 to-violet-700' },
  { id: 's4', name: 'Marketing', abbreviation: 'MK', color: 'from-amber-500 to-amber-700', unread: 3, hasNotification: true },
  { id: 's5', name: 'Product', abbreviation: 'PR', color: 'from-rose-500 to-rose-700', unread: 1 },
];

export const CHANNELS: Channel[] = [
  { id: 'c1', name: 'general', type: 'text' },
  { id: 'c2', name: 'announcements', type: 'text' },
  { id: 'c3', name: 'development', type: 'text', unread: 5 },
  { id: 'c4', name: 'design-feedback', type: 'text' },
  { id: 'c5', name: 'Team Voice', type: 'voice' },
  { id: 'c6', name: 'random', type: 'text' },
];

export const CHAT_USERS: ChatUser[] = [
  { id: 'u1', name: 'Alex Johnson', role: 'Admin', status: 'online' },
  { id: 'u2', name: 'Sarah Chen', role: 'Developer', status: 'online' },
  { id: 'u3', name: 'Mike Williams', role: 'Designer', status: 'idle' },
  { id: 'u4', name: 'Emma Davis', role: 'Product Manager', status: 'online' },
  { id: 'u5', name: 'Tom Brown', role: 'Developer', status: 'dnd' },
  { id: 'u6', name: 'Lisa Anderson', role: 'Marketing', status: 'offline' },
  { id: 'u7', name: 'James Wilson', role: 'Developer', status: 'offline' },
  { id: 'u8', name: 'Anna Martinez', role: 'Designer', status: 'online' },
];

export const MESSAGES: Message[] = [
  { id: 'm1', userId: 'u1', username: 'Alex Johnson', content: 'Good morning team! Hope everyone had a great weekend 😊', timestamp: 'Today at 9:00 AM' },
  { id: 'm2', userId: 'u2', username: 'Sarah Chen', content: 'Morning! Ready to crush it this week. We have the sprint review coming up.', timestamp: 'Today at 9:02 AM' },
  { id: 'm3', userId: 'u4', username: 'Emma Davis', content: 'The new feature designs are ready for review. I\'ll share the link in #design-feedback', timestamp: 'Today at 9:15 AM' },
  { id: 'm4', userId: 'u1', username: 'Alex Johnson', content: 'Sounds great Emma! I\'ll check them out this afternoon.', timestamp: 'Today at 9:17 AM' },
  { id: 'm5', userId: 'u3', username: 'Mike Williams', content: 'Can we schedule a quick sync today to go over the design system updates?', timestamp: 'Today at 9:45 AM' },
  { id: 'm6', userId: 'u2', username: 'Sarah Chen', content: 'Sure! How about 2 PM?', timestamp: 'Today at 9:47 AM' },
  { id: 'm7', userId: 'u3', username: 'Mike Williams', content: '2 PM works for me 👍', timestamp: 'Today at 9:48 AM' },
  { id: 'm8', userId: 'u5', username: 'Tom Brown', content: 'Just pushed the latest bug fixes. PR is up for review!', timestamp: 'Today at 10:30 AM' },
  { id: 'm9', userId: 'u1', username: 'Alex Johnson', content: 'Thanks Tom! I\'ll review it after the standup.', timestamp: 'Today at 10:32 AM' },
  { id: 'm10', userId: 'u8', username: 'Anna Martinez', content: 'The new component library looks amazing! Great work everyone 🎉', timestamp: 'Today at 11:00 AM' },
];

// --- Utilities ---

export const getAvatarColor = (name: string) => {
  const colors = [
    'from-blue-500 to-blue-600',
    'from-violet-500 to-violet-600',
    'from-emerald-500 to-emerald-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-cyan-500 to-cyan-600',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
};

export const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
