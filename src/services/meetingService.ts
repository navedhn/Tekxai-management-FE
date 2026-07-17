import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { unwrapApiData } from '@/utils/apiResponse';
import { API_ENDPOINTS } from './api/endpoints';
import { QUERY_KEYS } from './api/tanstackKeys';

// --- Types ---

export type MeetingRoomStatus = 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type AgendaStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type ActionItemStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type ActionItemPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type AttachableType = 'ROOM' | 'MEETING' | 'AGENDA_ITEM' | 'ACTION_ITEM';

export interface BasicUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  avatar: string | null;
}

export interface MeetingRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: 'MEMBER' | 'OWNER';
  user: BasicUser;
}

export interface AgendaItem {
  id: string;
  room_id: string;
  meeting_id: string | null;
  title: string;
  description: string | null;
  status: AgendaStatus;
  created_at: string;
  updated_at: string;
}

export interface MeetingRoom {
  id: string;
  name: string;
  description: string | null;
  status: MeetingRoomStatus;
  owner_id: string;
  department_id: string | null;
  created_at: string;
  updated_at: string;
  owner?: BasicUser;
  department?: { id: string; name: string } | null;
  members?: MeetingRoomMember[];
  agenda_items?: AgendaItem[];
  meetings?: Meeting[];
  _count?: { meetings: number; agenda_items: number };
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  user: BasicUser;
}

export interface MeetingNote {
  id: string;
  meeting_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: BasicUser;
}

export interface MeetingDecision {
  id: string;
  meeting_id: string;
  decision_text: string;
  decided_by: string;
  created_at: string;
  decider?: BasicUser;
}

export interface ActionItem {
  id: string;
  meeting_id: string;
  title: string;
  assignee_id: string;
  due_date: string | null;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  assignee?: BasicUser;
  meeting?: { id: string; title: string; room_id: string };
}

export interface Meeting {
  id: string;
  room_id: string;
  title: string;
  scheduled_at: string;
  organizer_id: string;
  status: MeetingStatus;
  closed_at: string | null;
  previous_meeting_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  organizer?: BasicUser;
  room?: { id: string; name: string; status: MeetingRoomStatus };
  participants?: MeetingParticipant[];
  notes?: MeetingNote[];
  decisions?: MeetingDecision[];
  action_items?: ActionItem[];
  agenda_items?: AgendaItem[];
  previous_meeting?: { id: string; title: string; scheduled_at: string } | null;
  follow_ups?: { id: string; title: string; scheduled_at: string; status: MeetingStatus }[];
}

export interface MeetingAttachment {
  id: string;
  attachable_type: AttachableType;
  attachable_id: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
  uploader?: BasicUser;
}

export interface DashboardData {
  active_meeting_rooms: number;
  upcoming_meetings: Meeting[];
  overdue_action_items: number;
  pending_agenda_items: number;
  completed_meetings: number;
}

interface Paginated<T> {
  records: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// --- Raw API calls ---

function toQuery(params?: Record<string, any>) {
  if (!params) return '';
  const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const qs = new URLSearchParams(filtered as Record<string, string>).toString();
  return qs ? `?${qs}` : '';
}

const getDashboardApi = async () => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.DASHBOARD);
  return unwrapApiData<DashboardData>(res);
};

const getRoomsApi = async (params?: Record<string, any>) => {
  const res = await apiRequest<unknown>(`${API_ENDPOINTS.MEETING.ROOM_LIST}${toQuery(params)}`);
  return unwrapApiData<Paginated<MeetingRoom>>(res);
};

const getRoomApi = async (id: string) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.ROOM_DETAIL(id));
  return unwrapApiData<MeetingRoom>(res);
};

const createRoomApi = async (data: Partial<MeetingRoom> & { member_ids?: string[] }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.ROOM_CREATE, { method: 'POST', body: JSON.stringify(data) });
  return unwrapApiData<MeetingRoom>(res);
};

const updateRoomApi = async ({ id, data }: { id: string; data: Partial<MeetingRoom> }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.ROOM_UPDATE(id), { method: 'PUT', body: JSON.stringify(data) });
  return unwrapApiData<MeetingRoom>(res);
};

const setRoomStatusApi = async ({ id, status }: { id: string; status: MeetingRoomStatus }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.ROOM_STATUS(id), { method: 'PATCH', body: JSON.stringify({ status }) });
  return unwrapApiData<MeetingRoom>(res);
};

const deleteRoomApi = async (id: string) => apiRequest(API_ENDPOINTS.MEETING.ROOM_DELETE(id), { method: 'DELETE' });

const addRoomMemberApi = async ({ id, user_id, role }: { id: string; user_id: string; role?: 'MEMBER' | 'OWNER' }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.ROOM_MEMBERS(id), { method: 'POST', body: JSON.stringify({ user_id, role }) });
  return unwrapApiData<MeetingRoomMember>(res);
};

const removeRoomMemberApi = async ({ id, userId }: { id: string; userId: string }) =>
  apiRequest(API_ENDPOINTS.MEETING.ROOM_MEMBER(id, userId), { method: 'DELETE' });

const getRoomTimelineApi = async (id: string) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.ROOM_TIMELINE(id));
  return unwrapApiData<Paginated<any>>(res);
};

const getAgendaItemsApi = async ({ roomId, params }: { roomId: string; params?: Record<string, any> }) => {
  const res = await apiRequest<unknown>(`${API_ENDPOINTS.MEETING.ROOM_AGENDA_LIST(roomId)}${toQuery(params)}`);
  return unwrapApiData<AgendaItem[]>(res);
};

const createAgendaItemApi = async ({ roomId, data }: { roomId: string; data: Partial<AgendaItem> }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.ROOM_AGENDA_CREATE(roomId), { method: 'POST', body: JSON.stringify(data) });
  return unwrapApiData<AgendaItem>(res);
};

const updateAgendaItemApi = async ({ roomId, agendaId, data }: { roomId: string; agendaId: string; data: Partial<AgendaItem> }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.AGENDA_UPDATE(roomId, agendaId), { method: 'PUT', body: JSON.stringify(data) });
  return unwrapApiData<AgendaItem>(res);
};

const completeAgendaItemApi = async ({ roomId, agendaId, meeting_id }: { roomId: string; agendaId: string; meeting_id?: string }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.AGENDA_COMPLETE(roomId, agendaId), { method: 'PATCH', body: JSON.stringify({ meeting_id }) });
  return unwrapApiData<AgendaItem>(res);
};

const getMeetingsApi = async (params?: Record<string, any>) => {
  const res = await apiRequest<unknown>(`${API_ENDPOINTS.MEETING.LIST}${toQuery(params)}`);
  return unwrapApiData<Paginated<Meeting>>(res);
};

const getMeetingApi = async (id: string) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.DETAIL(id));
  return unwrapApiData<Meeting>(res);
};

const createMeetingApi = async (data: Partial<Meeting> & { participant_ids?: string[] }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.CREATE, { method: 'POST', body: JSON.stringify(data) });
  return unwrapApiData<Meeting>(res);
};

const updateMeetingApi = async ({ id, data }: { id: string; data: Partial<Meeting> & { participant_ids?: string[] } }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.UPDATE(id), { method: 'PUT', body: JSON.stringify(data) });
  return unwrapApiData<Meeting>(res);
};

const closeMeetingApi = async (id: string) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.CLOSE(id), { method: 'PATCH' });
  return unwrapApiData<Meeting>(res);
};

const cancelMeetingApi = async (id: string) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.CANCEL(id), { method: 'PATCH' });
  return unwrapApiData<Meeting>(res);
};

const addParticipantApi = async ({ id, user_id }: { id: string; user_id: string }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.PARTICIPANTS(id), { method: 'POST', body: JSON.stringify({ user_id }) });
  return unwrapApiData<MeetingParticipant>(res);
};

const getMeetingTimelineApi = async (id: string) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.TIMELINE(id));
  return unwrapApiData<Paginated<any>>(res);
};

const addNoteApi = async ({ id, content }: { id: string; content: string }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.NOTES(id), { method: 'POST', body: JSON.stringify({ content }) });
  return unwrapApiData<MeetingNote>(res);
};

const updateNoteApi = async ({ noteId, content }: { noteId: string; content: string }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.NOTE_UPDATE(noteId), { method: 'PUT', body: JSON.stringify({ content }) });
  return unwrapApiData<MeetingNote>(res);
};

const addDecisionApi = async ({ id, decision_text }: { id: string; decision_text: string }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.DECISIONS(id), { method: 'POST', body: JSON.stringify({ decision_text }) });
  return unwrapApiData<MeetingDecision>(res);
};

const getActionItemsApi = async (params?: Record<string, any>) => {
  const res = await apiRequest<unknown>(`${API_ENDPOINTS.MEETING.ACTION_ITEM_LIST}${toQuery(params)}`);
  return unwrapApiData<Paginated<ActionItem>>(res);
};

const createActionItemApi = async ({ meetingId, data }: { meetingId: string; data: Partial<ActionItem> }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.ACTION_ITEM_CREATE(meetingId), { method: 'POST', body: JSON.stringify(data) });
  return unwrapApiData<ActionItem>(res);
};

const updateActionItemApi = async ({ actionId, data }: { actionId: string; data: Partial<ActionItem> }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.ACTION_ITEM_UPDATE(actionId), { method: 'PUT', body: JSON.stringify(data) });
  return unwrapApiData<ActionItem>(res);
};

const completeActionItemApi = async (actionId: string) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.ACTION_ITEM_COMPLETE(actionId), { method: 'PATCH' });
  return unwrapApiData<ActionItem>(res);
};

const getAttachmentsApi = async ({ attachable_type, attachable_id }: { attachable_type: AttachableType; attachable_id: string }) => {
  const res = await apiRequest<unknown>(`${API_ENDPOINTS.MEETING.ATTACHMENT_LIST}${toQuery({ attachable_type, attachable_id })}`);
  return unwrapApiData<MeetingAttachment[]>(res);
};

const addAttachmentApi = async (data: { attachable_type: AttachableType; attachable_id: string; file_url: string; file_name: string }) => {
  const res = await apiRequest<unknown>(API_ENDPOINTS.MEETING.ATTACHMENT_CREATE, { method: 'POST', body: JSON.stringify(data) });
  return unwrapApiData<MeetingAttachment>(res);
};

// --- Hooks ---

export const useMeetingDashboard = () =>
  useQuery({ queryKey: QUERY_KEYS.MEETING.DASHBOARD, queryFn: getDashboardApi });

export const useMeetingRooms = (params?: Record<string, any>) =>
  useQuery({ queryKey: QUERY_KEYS.MEETING.ROOM_LIST(params), queryFn: () => getRoomsApi(params) });

export const useMeetingRoom = (id: string | null) =>
  useQuery({ queryKey: QUERY_KEYS.MEETING.ROOM_DETAIL(id || ''), queryFn: () => getRoomApi(id!), enabled: !!id });

export const useCreateMeetingRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRoomApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meeting', 'room', 'list'] }),
  });
};

export const useUpdateMeetingRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateRoomApi,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meeting', 'room', 'list'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.ROOM_DETAIL(data.id) });
    },
  });
};

export const useSetMeetingRoomStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: setRoomStatusApi,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meeting', 'room', 'list'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.ROOM_DETAIL(data.id) });
    },
  });
};

export const useDeleteMeetingRoom = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRoomApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meeting', 'room', 'list'] }),
  });
};

export const useAddRoomMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addRoomMemberApi,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.ROOM_DETAIL(vars.id) }),
  });
};

export const useRemoveRoomMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeRoomMemberApi,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.ROOM_DETAIL(vars.id) }),
  });
};

export const useMeetingRoomTimeline = (id: string | null) =>
  useQuery({ queryKey: QUERY_KEYS.MEETING.ROOM_TIMELINE(id || ''), queryFn: () => getRoomTimelineApi(id!), enabled: !!id });

export const useAgendaItems = (roomId: string | null, params?: Record<string, any>) =>
  useQuery({ queryKey: QUERY_KEYS.MEETING.AGENDA_LIST(roomId || '', params), queryFn: () => getAgendaItemsApi({ roomId: roomId!, params }), enabled: !!roomId });

export const useCreateAgendaItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAgendaItemApi,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.AGENDA_LIST(vars.roomId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.ROOM_DETAIL(vars.roomId) });
    },
  });
};

export const useUpdateAgendaItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateAgendaItemApi,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.AGENDA_LIST(vars.roomId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.ROOM_DETAIL(vars.roomId) });
    },
  });
};

export const useCompleteAgendaItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: completeAgendaItemApi,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.AGENDA_LIST(vars.roomId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.ROOM_DETAIL(vars.roomId) });
    },
  });
};

export const useMeetings = (params?: Record<string, any>) =>
  useQuery({ queryKey: QUERY_KEYS.MEETING.MEETING_LIST(params), queryFn: () => getMeetingsApi(params) });

export const useMeeting = (id: string | null) =>
  useQuery({ queryKey: QUERY_KEYS.MEETING.MEETING_DETAIL(id || ''), queryFn: () => getMeetingApi(id!), enabled: !!id });

export const useCreateMeeting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMeetingApi,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meeting', 'list'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.ROOM_DETAIL(data.room_id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.DASHBOARD });
    },
  });
};

export const useUpdateMeeting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateMeetingApi,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meeting', 'list'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.MEETING_DETAIL(data.id) });
    },
  });
};

export const useCloseMeeting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: closeMeetingApi,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meeting', 'list'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.MEETING_DETAIL(data.id) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.DASHBOARD });
    },
  });
};

export const useCancelMeeting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelMeetingApi,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meeting', 'list'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.MEETING_DETAIL(data.id) });
    },
  });
};

export const useAddParticipant = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addParticipantApi,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.MEETING_DETAIL(vars.id) }),
  });
};

export const useMeetingTimeline = (id: string | null) =>
  useQuery({ queryKey: QUERY_KEYS.MEETING.MEETING_TIMELINE(id || ''), queryFn: () => getMeetingTimelineApi(id!), enabled: !!id });

export const useAddMeetingNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addNoteApi,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.MEETING_DETAIL(vars.id) }),
  });
};

export const useUpdateMeetingNote = (meetingId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateNoteApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.MEETING_DETAIL(meetingId) }),
  });
};

export const useAddMeetingDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addDecisionApi,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.MEETING_DETAIL(vars.id) }),
  });
};

export const useActionItems = (params?: Record<string, any>) =>
  useQuery({ queryKey: QUERY_KEYS.MEETING.ACTION_ITEM_LIST(params), queryFn: () => getActionItemsApi(params) });

export const useCreateActionItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createActionItemApi,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['meeting', 'action-item'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.MEETING_DETAIL(vars.meetingId) });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.DASHBOARD });
    },
  });
};

export const useUpdateActionItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateActionItemApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meeting', 'action-item'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.DASHBOARD });
    },
  });
};

export const useCompleteActionItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: completeActionItemApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meeting', 'action-item'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.DASHBOARD });
    },
  });
};

export const useMeetingAttachments = (attachable_type: AttachableType, attachable_id: string | null) =>
  useQuery({
    queryKey: QUERY_KEYS.MEETING.ATTACHMENT_LIST(attachable_type, attachable_id || ''),
    queryFn: () => getAttachmentsApi({ attachable_type, attachable_id: attachable_id! }),
    enabled: !!attachable_id,
  });

export const useAddMeetingAttachment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addAttachmentApi,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: QUERY_KEYS.MEETING.ATTACHMENT_LIST(vars.attachable_type, vars.attachable_id) }),
  });
};
