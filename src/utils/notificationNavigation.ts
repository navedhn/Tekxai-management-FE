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

function isChatLikeNotification(notif: Notification): boolean {
  const type = (notif.type || '').toLowerCase();
  return type.includes('message') || type === 'mention' || type.includes('reply') || type.includes('chat');
}

/**
 * Chat / message / mention / reply notifications always open the Client Portal
 * Communication tab for that project (with ?message= when available) — never
 * the Admin Projects slide-over. Approvals and other types keep their own links.
 */
export function resolveNotificationDestination(
  notif: Notification,
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '',
): string | null {
  const link = (notif.link || '').trim();
  if (link.startsWith('/') && !link.startsWith('//')) {
    const normalized = normalizeNotificationLink(link, notif);
    if (normalized) return normalized;
  }

  const type = (notif.type || '').toLowerCase();
  const entityId = notif.entity_id;

  if (isChatLikeNotification(notif) && entityId && (notif.entity_type === 'project' || !notif.entity_type)) {
    return `/portal/projects/${entityId}/communication`;
  }

  if (type.includes('approval') && entityId) {
    // Prefer stored portal approvals link when present; otherwise try project-scoped path from entity.
    if (pathname.startsWith('/portal') || notif.entity_type === 'milestone_approval') {
      // entity_id is often the approval id — without project id we cannot build a path; use link only.
      return null;
    }
  }

  if (type.includes('ticket')) {
    return pathname.startsWith('/employee') ? '/employee/tickets' : '/admin/tickets';
  }
  return null;
}

/** Rewrite admin communication deep-links → portal Communication (+ message id). */
function normalizeNotificationLink(link: string, notif?: Notification): string {
  try {
    const url = new URL(link, 'https://tekxai.services');
    const messageFromQuery = url.searchParams.get('message');

    // /admin/projects?project=:id&tab=communication&message=:mid
    if (url.pathname.startsWith('/admin/projects')) {
      const projectId = url.searchParams.get('project');
      const tab = url.searchParams.get('tab');
      if (projectId && (tab === 'communication' || isChatLikeNotification(notif || ({} as Notification)) || messageFromQuery)) {
        const q = messageFromQuery ? `?message=${encodeURIComponent(messageFromQuery)}` : '';
        return `/portal/projects/${projectId}/communication${q}`;
      }
      // Non-chat admin project links stay as-is for internal tooling
      if (!isChatLikeNotification(notif || ({} as Notification))) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      if (projectId) {
        return `/portal/projects/${projectId}/communication`;
      }
    }

    // /portal/projects/:id?message= → /portal/projects/:id/communication?message=
    const portalProject = url.pathname.match(/^\/portal\/projects\/([^/]+)\/?$/);
    if (portalProject) {
      const q = url.search || '';
      if (url.searchParams.has('message') || isChatLikeNotification(notif || ({} as Notification))) {
        return `/portal/projects/${portalProject[1]}/communication${q.includes('message') ? q : ''}`;
      }
    }

    // Ensure /communication paths keep message= query when present
    const portalComm = url.pathname.match(/^\/portal\/projects\/([^/]+)\/communication\/?$/);
    if (portalComm) {
      return `/portal/projects/${portalComm[1]}/communication${url.search}${url.hash}`;
    }

    // Chat-like notifications whose link still points at admin root → portal if we have entity_id
    if (notif && isChatLikeNotification(notif) && notif.entity_id && url.pathname.startsWith('/admin')) {
      const mid = messageFromQuery;
      return `/portal/projects/${notif.entity_id}/communication${mid ? `?message=${encodeURIComponent(mid)}` : ''}`;
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
