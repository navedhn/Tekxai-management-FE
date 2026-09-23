import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Video, Gavel, CheckSquare, Activity as ActivityIcon,
  Plus, ExternalLink,
} from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import Textarea from './Textarea';
import Button from './Button';
import Loader from './Loader';
import SearchFilterBar from './SearchFilterBar';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useCommunicationTimeline, type CommunicationEvent, type CommunicationEventType } from '@/services/communicationTimelineService';
import { useCreateDiscussion } from '@/services/projectDiscussionsService';
import { useCreateWeeklyUpdate } from '@/services/weeklyUpdatesService';
import type { CommChannel } from '@/types/devopsAccess';
import { cn } from '@/utils/cn';
import ClientCommunicationThread from './ClientCommunicationThread';

const TYPE_META: Record<CommunicationEventType, { label: string; icon: React.ElementType; color: string }> = {
  WEEKLY_UPDATE:    { label: 'Weekly Update',    icon: MessageSquare, color: 'text-blue-500 bg-blue-50' },
  DISCUSSION:       { label: 'Note',             icon: MessageSquare, color: 'text-purple-500 bg-purple-50' },
  MEETING:          { label: 'Meeting',          icon: Video,         color: 'text-emerald-500 bg-emerald-50' },
  MEETING_DECISION: { label: 'Decision',         icon: Gavel,         color: 'text-amber-500 bg-amber-50' },
  ACTION_ITEM:      { label: 'Action Item',      icon: CheckSquare,   color: 'text-orange-500 bg-orange-50' },
  ACTIVITY:         { label: 'Activity',         icon: ActivityIcon,  color: 'text-gray-400 bg-gray-50' },
};

const TYPE_FILTER_OPTIONS = [
  { label: 'All Types', value: 'ALL' },
  ...Object.entries(TYPE_META).map(([value, meta]) => ({ label: meta.label, value })),
];

const METHOD_OPTIONS: { label: string; value: CommChannel }[] = [
  { label: 'ClickUp', value: 'CLICKUP' },
  { label: 'Email', value: 'EMAIL' },
  { label: 'WhatsApp', value: 'WHATSAPP' },
  { label: 'Slack', value: 'SLACK' },
  { label: 'Microsoft Teams', value: 'TEAMS' },
  { label: 'Discord', value: 'DISCORD' },
  { label: 'Skype', value: 'SKYPE' },
  { label: 'Zoom', value: 'ZOOM' },
  { label: 'Upwork', value: 'UPWORK' },
  { label: 'Fiverr', value: 'FIVERR' },
  { label: 'Phone', value: 'PHONE' },
  { label: 'Google Meet', value: 'GOOGLE_MEET' },
  { label: 'Other', value: 'OTHER' },
];

interface ClientCommunicationPanelProps {
  projectId: string;
  canEdit: boolean;
  // Project-membership-based authorization for the real, live Client
  // Communication thread below — distinct from `canEdit` (owner/leader/
  // erp.projects.edit only), which continues to gate the internal-only
  // "Add Note"/"Log Update" timeline exactly as before. A plain assigned
  // project member can participate in communication without being able to
  // edit the project itself.
  canParticipateInCommunication?: boolean;
  // A discussion/message id to scroll to and highlight once loaded (from a
  // mention/notification deep link). Timeline events prefix their own id
  // as `discussion:<id>`, so this is matched against
  // event.related_entity.id, the real underlying project_discussions id —
  // the same id a mention notification's `message=` param carries. The
  // live thread below matches the same id directly against its own
  // message ids (no prefix).
  highlightMessageId?: string | null;
}

const ClientCommunicationPanel: React.FC<ClientCommunicationPanelProps> = ({ projectId, canEdit, canParticipateInCommunication, highlightMessageId }) => {
  const toast = useToastContext();
  const { data: events = [], isLoading } = useCommunicationTimeline(projectId);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!highlightMessageId || isLoading || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightMessageId, isLoading, events.length]);
  const createDiscussion = useCreateDiscussion(projectId);
  const createWeeklyUpdate = useCreateWeeklyUpdate(projectId);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CommunicationEventType | 'ALL'>('ALL');
  const [authorFilter, setAuthorFilter] = useState('ALL');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateForm, setUpdateForm] = useState({ method: 'EMAIL' as CommChannel, summary: '', client_response: '', attachment_url: '' });

  const authorOptions = useMemo(() => {
    const names = Array.from(new Set(events.map((e) => e.author).filter(Boolean))) as string[];
    return [{ label: 'All Users', value: 'ALL' }, ...names.map((n) => ({ label: n, value: n }))];
  }, [events]);

  const filtered = useMemo(() => {
    let list = events.filter((e) => {
      if (typeFilter !== 'ALL' && e.type !== typeFilter) return false;
      if (authorFilter !== 'ALL' && e.author !== authorFilter) return false;
      if (search && !e.summary?.toLowerCase().includes(search.toLowerCase()) && !e.author?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortDir === 'asc' ? diff : -diff;
    });
    return list;
  }, [events, typeFilter, authorFilter, search, sortDir]);

  const handleAddNote = () => {
    if (!noteContent.trim()) return toast.error('Note content is required');
    createDiscussion.mutate({ content: noteContent }, {
      onSuccess: () => { toast.success('Note added'); setNoteContent(''); setShowNoteForm(false); },
      onError: (e: any) => toast.error(e?.message || 'Failed to add note'),
    });
  };

  const handleLogUpdate = () => {
    if (!updateForm.summary.trim()) return toast.error('Summary is required');
    createWeeklyUpdate.mutate(updateForm, {
      onSuccess: () => { toast.success('Update logged'); setUpdateForm({ method: 'EMAIL', summary: '', client_response: '', attachment_url: '' }); setShowUpdateForm(false); },
      onError: (e: any) => toast.error(e?.message || 'Failed to log update'),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* The REAL, live, two-way Client Communication thread —
          POST /project/:id/messages, always CLIENT_VISIBLE from this
          composer. Deliberately a separate component/section from the
          internal-only timeline below, so the two can never be confused:
          this is what the client actually sees and can reply to. */}
      <ClientCommunicationThread
        projectId={projectId}
        canParticipate={!!canParticipateInCommunication}
        highlightMessageId={highlightMessageId}
      />

    <div className="flex flex-col bg-white border border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
      <div className="w-full flex items-center justify-between gap-3 p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <MessageSquare size={18} strokeWidth={2.5} className="text-primary-500" />
          <div>
            <h3 className="font-black text-gray-900 tracking-tight text-[15px]">Internal Timeline &amp; Notes</h3>
            <p className="text-[11px] text-gray-400 font-semibold">Internal-only — logged updates and notes here are never visible to the client.</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button leftIcon={Plus} onClick={() => { setShowUpdateForm((s) => !s); setShowNoteForm(false); }} className="bg-[#005CDA11] hover:bg-[#005CDA22] border-none font-black text-[11px] h-9 rounded-xl py-0 px-4">
              Log Update
            </Button>
            <Button leftIcon={Plus} onClick={() => { setShowNoteForm((s) => !s); setShowUpdateForm(false); }} className="bg-purple-50 hover:bg-purple-100 border-none font-black text-[11px] h-9 rounded-xl py-0 px-4 text-purple-600">
              Add Note
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 p-6">
        {showUpdateForm && (
          <div className="flex flex-col gap-3 p-4 bg-gray-50/60 rounded-2xl">
            <SearchableSelect label="Method" options={METHOD_OPTIONS} value={updateForm.method} onChange={(v) => setUpdateForm((f) => ({ ...f, method: v as CommChannel }))} />
            <Textarea label="Summary *" value={updateForm.summary} onChange={(e) => setUpdateForm((f) => ({ ...f, summary: e.target.value }))} placeholder="What was shared with the client..." className="min-h-[70px]" />
            <Textarea label="Client Response (optional)" value={updateForm.client_response} onChange={(e) => setUpdateForm((f) => ({ ...f, client_response: e.target.value }))} placeholder="How did the client respond..." className="min-h-[50px]" />
            <input
              type="url"
              value={updateForm.attachment_url}
              onChange={(e) => setUpdateForm((f) => ({ ...f, attachment_url: e.target.value }))}
              placeholder="Attachment/link (optional) — https://..."
              className="w-full border border-gray-200 rounded-xl h-10 px-3 text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUpdateForm(false)} className="h-9 rounded-xl font-bold text-xs px-4">Cancel</Button>
              <Button onClick={handleLogUpdate} disabled={createWeeklyUpdate.isPending} className="bg-primary-500 text-white h-9 rounded-xl font-bold text-xs px-4">
                {createWeeklyUpdate.isPending ? 'Saving…' : 'Save Update'}
              </Button>
            </div>
          </div>
        )}

        {showNoteForm && (
          <div className="flex flex-col gap-3 p-4 bg-purple-50/40 rounded-2xl">
            <Textarea label="Note" value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Add a project note or comment..." className="min-h-[70px]" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNoteForm(false)} className="h-9 rounded-xl font-bold text-xs px-4">Cancel</Button>
              <Button onClick={handleAddNote} disabled={createDiscussion.isPending} className="bg-purple-500 text-white h-9 rounded-xl font-bold text-xs px-4">
                {createDiscussion.isPending ? 'Saving…' : 'Save Note'}
              </Button>
            </div>
          </div>
        )}

        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search communication…"
          filters={[
            { options: TYPE_FILTER_OPTIONS, value: typeFilter, onChange: (v) => setTypeFilter(v as CommunicationEventType | 'ALL'), containerClassName: 'sm:w-44' },
            { options: authorOptions, value: authorFilter, onChange: (v) => setAuthorFilter(String(v)), containerClassName: 'sm:w-40' },
          ]}
          sort={{ label: sortDir === 'desc' ? 'Newest' : 'Oldest', onToggle: () => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc')) }}
        />

        {isLoading && <div className="flex justify-center py-6"><Loader size={28} /></div>}

        {!isLoading && filtered.length === 0 && (
          <span className="text-xs text-gray-400 italic">
            {events.length === 0 ? 'No communication activity yet for this project.' : 'No events match your search/filters.'}
          </span>
        )}

        <div className="flex flex-col gap-2">
          {filtered.map((event) => {
            const isHighlighted = !!highlightMessageId && event.related_entity?.id === highlightMessageId;
            return (
              <TimelineRow
                key={event.id}
                event={event}
                highlighted={isHighlighted}
                highlightRef={isHighlighted ? highlightRef : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
};

const TimelineRow: React.FC<{ event: CommunicationEvent; highlighted?: boolean; highlightRef?: React.Ref<HTMLDivElement> }> = ({ event, highlighted, highlightRef }) => {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  return (
    <div
      ref={highlightRef}
      className={cn(
        'flex items-start gap-3 p-3 hover:bg-gray-50/60 rounded-2xl transition-colors',
        highlighted && 'bg-primary-50/70 ring-2 ring-primary-300',
      )}
    >
      <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', meta.color)}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{meta.label}</span>
            {event.author && <span className="text-xs font-bold text-gray-700">{event.author}</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
              {new Date(event.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            {event.type === 'MEETING' && (
              <a href={`/admin/meetings/meeting/${event.related_entity.id}`} target="_blank" rel="noreferrer" className="p-1 text-gray-300 hover:text-primary-500 transition-colors">
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
        <p className="text-sm font-medium text-gray-700 mt-0.5 break-words">{event.summary}</p>
        {event.type === 'WEEKLY_UPDATE' && event.related_entity.client_response && (
          <p className="text-xs text-gray-500 italic border-l-2 border-primary-200 pl-2 mt-1">Client: {event.related_entity.client_response}</p>
        )}
        {event.type === 'WEEKLY_UPDATE' && event.related_entity.attachment_url && (
          <a href={event.related_entity.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline mt-1">
            <ExternalLink size={11} /> Attachment
          </a>
        )}
      </div>
    </div>
  );
};

export default ClientCommunicationPanel;
