import React, { useRef, useState, useEffect } from 'react';
import { X, Plus, Clock, Check, MessageSquare, Paperclip, Link2, Trash2, Download } from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import type { KanbanTask, TaskStatus, TaskPriority } from '@/services/tasksService';
import {
  useSubTasks,
  useCreateSubTask,
  useToggleSubTask,
  useTaskTimeLogs,
  useLogTime,
  useTaskComments,
  useCreateTaskComment,
  useDeleteTaskComment,
  useTaskAttachments,
  useUploadTaskAttachment,
  useDeleteTaskAttachment,
  useSetTaskDependencies,
} from '@/services/tasksService';
import { useAuth } from '@/hooks/useAuth';
import { useToastContext } from '@/components/toast/ToastProvider';

// --- Types ---

interface TaskDrawerProps {
  task: KanbanTask | null;
  allTasks?: KanbanTask[];
  projectId?: string | null;
  onClose: () => void;
  onUpdateTask: (taskId: string, updates: Partial<KanbanTask>) => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'TODO',        label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'REVIEW',      label: 'In Review' },
  { value: 'DONE',        label: 'Done' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'LOW',      label: 'Low' },
  { value: 'MEDIUM',   label: 'Medium' },
  { value: 'HIGH',     label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// --- Sub-Tasks Section ---

function SubTasksSection({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { data: subTasks = [] } = useSubTasks(projectId, taskId);
  const createMutation = useCreateSubTask(projectId, taskId);
  const toggleMutation = useToggleSubTask(projectId, taskId);
  const [newTitle, setNewTitle] = useState('');

  const completed = subTasks.filter(s => s.completed).length;
  const pct = subTasks.length > 0 ? Math.round((completed / subTasks.length) * 100) : 0;

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) return;
    createMutation.mutate(title);
    setNewTitle('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Sub-tasks</h3>
        {subTasks.length > 0 && (
          <span className="text-xs text-gray-400 font-medium">{completed}/{subTasks.length}</span>
        )}
      </div>

      {subTasks.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#005CDA] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] font-bold text-[#005CDA]">{pct}%</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {subTasks.map(sub => (
          <label key={sub.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group">
            <button
              onClick={() => toggleMutation.mutate({ subTaskId: sub.id, completed: !sub.completed })}
              className={cn(
                'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                sub.completed ? 'bg-[#005CDA] border-[#005CDA]' : 'border-gray-300 group-hover:border-[#005CDA]'
              )}
            >
              {sub.completed && <Check size={10} className="text-white" strokeWidth={3} />}
            </button>
            <span className={cn('text-sm font-medium', sub.completed ? 'text-gray-400 line-through' : 'text-gray-700')}>
              {sub.title}
            </span>
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add sub-task..."
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#005CDA] transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim() || createMutation.isPending}
          className="p-2 bg-[#005CDA] text-white rounded-lg hover:bg-[#0048B8] disabled:opacity-50 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// --- Time Log Section ---

function TimeLogSection({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { data: timeLogs = [] } = useTaskTimeLogs(projectId, taskId);
  const logMutation = useLogTime(projectId, taskId);
  const [manualSeconds, setManualSeconds] = useState('');
  const [note, setNote] = useState('');
  const [showForm, setShowForm] = useState(false);

  const totalSeconds = timeLogs.reduce((sum, log) => sum + log.seconds, 0);

  const handleLogManual = () => {
    const mins = parseFloat(manualSeconds);
    if (!mins || mins <= 0) return;
    logMutation.mutate({ seconds: Math.round(mins * 60), note: note.trim() || undefined });
    setManualSeconds('');
    setNote('');
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Time Logged</h3>
        <div className="flex items-center gap-1 text-sm font-bold text-gray-700">
          <Clock size={13} className="text-gray-400" />
          {totalSeconds > 0 ? formatDuration(totalSeconds) : '—'}
        </div>
      </div>

      {timeLogs.length > 0 && (
        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
          {timeLogs.map(log => (
            <div key={log.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-gray-50">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-gray-700">{formatDuration(log.seconds)}</span>
                {log.note && <span className="text-gray-400">{log.note}</span>}
              </div>
              <span className="text-gray-400">
                {new Date(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl">
          <input
            type="number"
            placeholder="Minutes"
            value={manualSeconds}
            onChange={e => setManualSeconds(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#005CDA] transition-colors bg-white"
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#005CDA] transition-colors bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleLogManual}
              disabled={!manualSeconds || logMutation.isPending}
              className="flex-1 text-sm font-bold py-2 bg-[#005CDA] text-white rounded-lg hover:bg-[#0048B8] disabled:opacity-50 transition-colors"
            >
              Log Time
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 text-sm font-bold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#005CDA] hover:text-[#0048B8] transition-colors"
        >
          <Plus size={14} />
          Add manual entry
        </button>
      )}
    </div>
  );
}

// --- Comments Section (modeled on Project Discussions' comment/discussion UX) ---

function CommentsSection({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { user, role } = useAuth();
  const toast = useToastContext();
  const { data: comments = [] } = useTaskComments(projectId, taskId);
  const createMutation = useCreateTaskComment(projectId, taskId);
  const deleteMutation = useDeleteTaskComment(projectId, taskId);
  const [content, setContent] = useState('');

  const handleAdd = () => {
    const text = content.trim();
    if (!text) return;
    createMutation.mutate({ content: text }, {
      onSuccess: () => setContent(''),
      onError: (e: any) => toast.error(e?.message || 'Failed to add comment'),
    });
  };

  const handleDelete = (commentId: string) => {
    deleteMutation.mutate(commentId, {
      onError: (e: any) => toast.error(e?.message || 'Failed to delete comment'),
    });
  };

  // Only list+create exist on the backend task_comments controller (no
  // update endpoint), so there is no Edit button here — just Delete,
  // gated the same way the backend gates it: author, or a manager-tier role.
  const isManager = !!role && ['ADMIN', 'SUPER_ADMIN', 'HR', 'DIVISION_MANAGER'].includes(role);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={14} className="text-gray-400" />
        <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Comments</h3>
        {comments.length > 0 && <span className="text-xs text-gray-400 font-medium">({comments.length})</span>}
      </div>

      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto custom-scrollbar">
        {comments.length === 0 && (
          <p className="text-xs text-gray-400 italic">No comments yet.</p>
        )}
        {comments.map((c) => {
          const canDelete = c.user_id === user?.id || isManager;
          return (
            <div key={c.id} className="flex flex-col gap-1 p-2.5 bg-gray-50 rounded-xl group">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-gray-700">
                  {c.user ? `${c.user.first_name} ${c.user.last_name || ''}`.trim() : 'Unknown'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">
                    {new Date(c.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                      title="Delete comment"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-700 font-medium whitespace-pre-wrap">{c.content}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#005CDA] transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={!content.trim() || createMutation.isPending}
          className="p-2 bg-[#005CDA] text-white rounded-lg hover:bg-[#0048B8] disabled:opacity-50 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// --- Attachments Section (reuses the shared uploadFile() helper — same
// component used by Project Documents / Employee Documents) ---

function AttachmentsSection({ projectId, taskId }: { projectId: string; taskId: string }) {
  const toast = useToastContext();
  const { data: attachments = [] } = useTaskAttachments(projectId, taskId);
  const uploadMutation = useUploadTaskAttachment(projectId, taskId);
  const deleteMutation = useDeleteTaskAttachment(projectId, taskId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file, {
      onError: (err: any) => toast.error(err?.message || 'Failed to upload attachment'),
    });
    e.target.value = '';
  };

  const handleDelete = (attachmentId: string) => {
    deleteMutation.mutate(attachmentId, {
      onError: (e: any) => toast.error(e?.message || 'Failed to delete attachment'),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={14} className="text-gray-400" />
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Attachments</h3>
          {attachments.length > 0 && <span className="text-xs text-gray-400 font-medium">({attachments.length})</span>}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="flex items-center gap-1 text-xs font-bold text-[#005CDA] hover:text-[#0048B8] transition-colors disabled:opacity-50"
        >
          <Plus size={13} /> {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {attachments.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No files attached yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg group">
              <a
                href={a.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-[#005CDA] truncate transition-colors"
                title={a.file_name}
              >
                <Download size={13} className="shrink-0 text-gray-400" />
                <span className="truncate">{a.file_name}</span>
              </a>
              <button
                onClick={() => handleDelete(a.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all shrink-0"
                title="Delete attachment"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Dependencies Section (task.depends_on_ids, modeled on how Milestones
// render/edit milestone.depends_on_ids) ---

const DEP_STATUS_STYLE: Record<string, string> = {
  TODO: 'bg-gray-100 text-gray-500',
  IN_PROGRESS: 'bg-blue-50 text-blue-600',
  REVIEW: 'bg-amber-50 text-amber-600',
  DONE: 'bg-green-50 text-green-700',
};

function DependenciesSection({ projectId, task, allTasks }: { projectId: string; task: KanbanTask; allTasks: KanbanTask[] }) {
  const toast = useToastContext();
  const setDependenciesMutation = useSetTaskDependencies(projectId);
  const [open, setOpen] = useState(false);
  const dependsOnIds = task.depends_on_ids || [];

  // Self-exclusion happens client-side here; the backend additionally
  // rejects a self-dependency with a 400 as a safety net (verified in the
  // tasks controller). There is no server-side circular-dependency check —
  // that's a gap, not something added on the frontend.
  const options = allTasks.filter((t) => t.id !== task.id);
  const available = options.filter((t) => !dependsOnIds.includes(t.id));

  const updateDeps = (nextIds: string[]) => {
    setDependenciesMutation.mutate({ taskId: task.id, depends_on_ids: nextIds }, {
      onError: (e: any) => toast.error(e?.message || 'Failed to update dependencies'),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Link2 size={14} className="text-gray-400" />
        <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Depends On</h3>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {dependsOnIds.map((id) => {
          const dep = allTasks.find((t) => t.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-bold px-2.5 py-1 rounded-lg">
              {dep?.title || id}
              {dep && (
                <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase', DEP_STATUS_STYLE[dep.status] || DEP_STATUS_STYLE.TODO)}>
                  {dep.status.replace('_', ' ')}
                </span>
              )}
              <button type="button" onClick={() => updateDeps(dependsOnIds.filter((s) => s !== id))} className="hover:text-red-500">
                <X size={11} />
              </button>
            </span>
          );
        })}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg"
          >
            <Plus size={12} /> Add
          </button>
          {open && (
            <div className="absolute z-20 mt-1 w-56 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl p-1.5">
              {available.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-2 py-2">
                  {options.length === 0 ? 'No other tasks in this project' : 'All tasks added'}
                </p>
              ) : (
                available.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { updateDeps([...dependsOnIds, t.id]); setOpen(false); }}
                    className="w-full text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg"
                  >
                    {t.title}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Drawer ---

const TaskDrawer: React.FC<TaskDrawerProps> = ({ task, allTasks = [], projectId, onClose, onUpdateTask }) => {
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    if (task) setTitle(task.title);
  }, [task?.id]);

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (task && title.trim() && title.trim() !== task.title) {
      onUpdateTask(task.id, { title: title.trim() });
    }
  };

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Task Detail</span>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 flex flex-col gap-6">
              {/* Title */}
              {editingTitle ? (
                <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={e => e.key === 'Enter' && handleTitleBlur()}
                  className="text-xl font-black text-gray-900 w-full outline-none border-b-2 border-[#005CDA] pb-1"
                />
              ) : (
                <h2
                  onClick={() => setEditingTitle(true)}
                  className="text-xl font-black text-gray-900 cursor-text hover:text-[#005CDA] transition-colors"
                >
                  {title}
                </h2>
              )}

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Status</label>
                  <select
                    value={task.status}
                    onChange={e => onUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#005CDA] transition-colors bg-white font-medium text-gray-700"
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Priority</label>
                  <select
                    value={task.priority}
                    onChange={e => onUpdateTask(task.id, { priority: e.target.value as TaskPriority })}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#005CDA] transition-colors bg-white font-medium text-gray-700"
                  >
                    {PRIORITY_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Assignee */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Assignee</label>
                  <div className="text-sm border border-gray-100 rounded-lg px-3 py-2 bg-gray-50 font-medium text-gray-600">
                    {task.assignee ? `${task.assignee.first_name} ${task.assignee.last_name || ''}`.trim() : 'Unassigned'}
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    defaultValue={task.due_date ? task.due_date.slice(0, 10) : ''}
                    onChange={e => onUpdateTask(task.id, { due_date: e.target.value })}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#005CDA] transition-colors bg-white font-medium text-gray-700"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Description</label>
                <textarea
                  defaultValue={task.description || ''}
                  onBlur={e => {
                    const val = e.target.value.trim();
                    if (val !== (task.description || '').trim()) {
                      onUpdateTask(task.id, { description: val });
                    }
                  }}
                  rows={3}
                  placeholder="Add a description..."
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[#005CDA] transition-colors resize-none font-medium text-gray-700 placeholder:text-gray-300"
                />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Sub-tasks */}
              {projectId && <SubTasksSection projectId={projectId} taskId={task.id} />}

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Time log */}
              {projectId && <TimeLogSection projectId={projectId} taskId={task.id} />}

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Dependencies */}
              {projectId && <DependenciesSection projectId={projectId} task={task} allTasks={allTasks} />}

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Attachments */}
              {projectId && <AttachmentsSection projectId={projectId} taskId={task.id} />}

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Comments */}
              {projectId && <CommentsSection projectId={projectId} taskId={task.id} />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TaskDrawer;
