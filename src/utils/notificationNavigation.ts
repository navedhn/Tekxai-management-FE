import type { LucideIcon } from 'lucide-react';
import {
  AtSign,
  Bell,
  Briefcase,
  CheckSquare,
  Clock,
  FileText,
  MessageSquare,
  Megaphone,
  Ticket,
} from 'lucide-react';
import type { Notification } from '@/services/notificationService';

/** Map API notification row → destination path, or null if nowhere useful. */
export function resolveNotificationDestination(
  notif: Notification,
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '',
): string | null {
  const link = (notif.link || '').trim();
  if (link.startsWith('/') && !link.startsWith('//')) {
    return normalizeNotificationLink(link);
  }

  const type = (notif.type || '').toLowerCase();
  const entityId = notif.entity_id;

  if ((type.includes('message') || type === 'mention' || type.includes('reply')) && entityId) {
    if (notif.entity_type === 'project') {
      if (pathname.startsWith('/portal')) {
        return `/portal/projects/${entityId}/communication`;
      }
      return `/admin/projects?project=${entityId}&tab=communication`;
    }
  }
  if (type.includes('ticket')) {
    return pathname.startsWith('/employee') ? '/employee/tickets' : '/admin/tickets';
  }
  return null;
}

/** Prefer communication deep-links that include /communication for portal. */
function normalizeNotificationLink(link: string): string {
  try {
    const url = new URL(link, 'https://tekxai.services');
    // /portal/projects/:id?message= → /portal/projects/:id/communication?message=
    const portalProject = url.pathname.match(/^\/portal\/projects\/([^/]+)\/?$/);
    if (portalProject && url.searchParams.has('message')) {
      return `/portal/projects/${portalProject[1]}/communication${url.search}`;
    }
    // Ensure /communication paths keep message= query when present
    const portalComm = url.pathname.match(/^\/portal\/projects\/([^/]+)\/communication\/?$/);
    if (portalComm && url.searchParams.has('message')) {
      return `/portal/projects/${portalComm[1]}/communication${url.search}`;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return link;
  }
}

export function notificationIconFor(type: string | null): LucideIcon {
  if (!type) return Bell;
  const t = type.toLowerCase();
  if (t.includes('mention')) return AtSign;
  if (t.includes('message') || t.includes('chat') || t.includes('reply')) return MessageSquare;
  if (t.includes('approval')) return CheckSquare;
  if (t.includes('ticket')) return Ticket;
  if (t.includes('attendance') || t.includes('timesheet') || t.includes('leave')) return Clock;
  if (t.includes('document') || t.includes('file') || t.includes('hr')) return FileText;
  if (t.includes('alert') || t.includes('reminder') || t.includes('warning')) return Megaphone;
  if (t.includes('project') || t.includes('milestone') || t.includes('task')) return Briefcase;
  return Bell;
}

export function notificationBody(notif: Notification): string {
  return notif.message || notif.body || '';
}
