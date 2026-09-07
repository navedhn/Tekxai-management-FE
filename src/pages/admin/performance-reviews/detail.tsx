import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock, Users, FileText, Shield, MessageSquare, Gauge, Award } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SearchableSelect from '@/components/ui/SearchableSelect';
import Textarea from '@/components/ui/Textarea';
import Loader from '@/components/ui/Loader';
import { useToastContext } from '@/components/toast/ToastProvider';
import { useMyPermissions } from '@/services/permissionsService';
import {
  useReviewEvidence, useUpdateReview, useAddManagerEvidence, useDeleteManagerEvidence,
  useRecordManagementDecision, Classification, RecommendedAction, EvidenceStance, ManagementDecision,
} from '@/services/performanceReviewsService';

const STANCE_OPTIONS: { label: string; value: EvidenceStance }[] = [
  { label: 'Neutral (context only)', value: 'NEUTRAL' },
  { label: 'Supporting', value: 'SUPPORTING' },
  { label: 'Counter-evidence', value: 'COUNTER' },
];

const MANAGEMENT_DECISION_OPTIONS: { label: string; value: ManagementDecision }[] = [
  { label: 'No Decision Yet', value: 'NO_DECISION' },
  { label: 'Increment Approved', value: 'INCREMENT_APPROVED' },
  { label: 'Increment Deferred', value: 'INCREMENT_DEFERRED' },
  { label: 'Increment Rejected', value: 'INCREMENT_REJECTED' },
  { label: 'Escalate to HR', value: 'ESCALATE_TO_HR' },
  { label: 'No Action Required', value: 'NO_ACTION_REQUIRED' },
];

const COMPLETENESS_STYLE: Record<string, string> = {
  SUFFICIENT_EVIDENCE: 'bg-emerald-50 text-emerald-700',
  PARTIAL_EVIDENCE: 'bg-amber-50 text-amber-600',
  INSUFFICIENT_EVIDENCE: 'bg-red-50 text-red-600',
};

const SOURCE_STATE_STYLE: Record<string, string> = {
  HAS_DATA: 'bg-emerald-50 text-emerald-700',
  NO_DATA: 'bg-amber-50 text-amber-600',
  NOT_APPLICABLE: 'bg-gray-100 text-gray-400',
};

const READINESS_STYLE: Record<string, string> = {
  ELIGIBLE_FOR_MANAGEMENT_REVIEW: 'bg-emerald-50 text-emerald-700',
  REVIEW_COMPLETED: 'bg-blue-50 text-blue-600',
  HOLD_FOR_FURTHER_EVIDENCE: 'bg-amber-50 text-amber-600',
  INSUFFICIENT_EVIDENCE: 'bg-red-50 text-red-600',
  REVIEW_NOT_COMPLETED: 'bg-gray-100 text-gray-500',
};

const CLASSIFICATION_OPTIONS: { label: string; value: Classification }[] = [
  { label: 'Insufficient Evidence', value: 'INSUFFICIENT_EVIDENCE' },
  { label: 'Strong Performance', value: 'STRONG_PERFORMANCE' },
  { label: 'Meets Expectations', value: 'MEETS_EXPECTATIONS' },
  { label: 'Needs Improvement', value: 'NEEDS_IMPROVEMENT' },
  { label: 'Performance Concern', value: 'PERFORMANCE_CONCERN' },
];

const RECOMMENDED_ACTION_OPTIONS: { label: string; value: RecommendedAction }[] = [
  { label: 'No Action', value: 'NO_ACTION' },
  { label: 'Continue Monitoring', value: 'CONTINUE_MONITORING' },
  { label: 'Recognition', value: 'RECOGNITION' },
  { label: 'Coaching Required', value: 'COACHING_REQUIRED' },
  { label: 'Training Required', value: 'TRAINING_REQUIRED' },
  { label: 'Performance Improvement Plan', value: 'PERFORMANCE_IMPROVEMENT_PLAN' },
  { label: 'Capacity Review', value: 'CAPACITY_REVIEW' },
  { label: 'Further Review Required', value: 'FURTHER_REVIEW_REQUIRED' },
];

const DELIVERY_STYLE: Record<string, string> = {
  ON_TIME: 'bg-emerald-50 text-emerald-700',
  MISSED: 'bg-red-50 text-red-600',
  PENDING: 'bg-gray-100 text-gray-500',
};
const OUTCOME_STYLE: Record<string, string> = {
  SUCCESSFUL: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-600',
  PENDING: 'bg-gray-100 text-gray-500',
};

const SectionCard: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }> = ({ icon, title, subtitle, children }) => (
  <div className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-6 flex flex-col gap-4">
    <div>
      <div className="flex items-center gap-2 text-gray-900 font-black">{icon}<span>{title}</span></div>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const Fact: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
    <div className="text-sm font-bold text-gray-800">{value}</div>
  </div>
);

const PerformanceReviewDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();
  const { data: myPerms } = useMyPermissions();
  const { data, isLoading, error } = useReviewEvidence(id);
  const updateReview = useUpdateReview(id || '');
  const addEvidence = useAddManagerEvidence(id || '');
  const deleteEvidence = useDeleteManagerEvidence(id || '');
  const recordDecision = useRecordManagementDecision(id || '');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [evidenceStance, setEvidenceStance] = useState<EvidenceStance>('NEUTRAL');
  const canDecide = !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('hr.performance_reviews.decide');

  if (isLoading) return <div className="flex items-center justify-center p-20"><Loader size={32} /></div>;
  if (error || !data) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-gray-500 font-semibold">
          {(error as any)?.message?.includes('404') || (error as any)?.status === 404
            ? 'This review does not exist, or you are not authorized to view it.'
            : 'Failed to load this review.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/admin/performance-reviews')} className="mt-4 h-10 rounded-xl font-bold">Back to Reviews</Button>
      </Card>
    );
  }

  const { review, role, project_evidence, attendance, utilization, warnings, manager_evidence, evidence_completeness, decision_indicators, missed_attribution, increment_readiness } = data;
  const isCompleted = review.status === 'COMPLETED';

  const handleClassify = (classification: string | number | null) => {
    updateReview.mutate({ classification: (classification as Classification) || null }, {
      onError: (e: any) => toast.error(e?.message || 'Failed to update classification'),
    });
  };
  const handleRecommend = (recommended_action: string | number | null) => {
    updateReview.mutate({ recommended_action: (recommended_action as RecommendedAction) || null }, {
      onError: (e: any) => toast.error(e?.message || 'Failed to update recommended action'),
    });
  };
  const handleStatusChange = (status: 'IN_REVIEW' | 'COMPLETED') => {
    updateReview.mutate({ status }, {
      onSuccess: () => toast.success(status === 'COMPLETED' ? 'Review completed' : 'Review moved to In Review'),
      onError: (e: any) => toast.error(e?.message || 'Failed to update review status'),
    });
  };
  const handleAddEvidence = () => {
    if (!evidenceNote.trim()) return;
    addEvidence.mutate({ note: evidenceNote.trim(), stance: evidenceStance }, {
      onSuccess: () => { setEvidenceNote(''); setEvidenceStance('NEUTRAL'); toast.success('Evidence added'); },
      onError: (e: any) => toast.error(e?.message || 'Failed to add evidence'),
    });
  };
  const handleRecordDecision = (decision: string | number | null) => {
    if (!decision) return;
    recordDecision.mutate(decision as ManagementDecision, {
      onSuccess: () => toast.success('Management decision recorded'),
      onError: (e: any) => toast.error(e?.message || 'Failed to record management decision'),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => navigate('/admin/performance-reviews')} className="!h-10 !w-10 !p-0 rounded-full"><ArrowLeft size={16} /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900">{`${review.user.first_name || ''} ${review.user.last_name || ''}`.trim()}</h1>
          <p className="text-sm text-gray-400">
            {role.designation?.name || 'No designation on record'} · {review.review_period?.name || 'No period'}
            {role.resolved_source === 'CURRENT' && <span className="italic"> (current designation — no historical record before this period)</span>}
          </p>
        </div>
        <Badge variant="info" className="rounded-lg px-3 py-1.5 text-xs font-black border-none bg-blue-50 text-blue-600">{review.status.replace('_', ' ')}</Badge>
      </div>

      <SectionCard icon={<Users size={18} className="text-primary-500" />} title="Assigned Projects / Responsibilities" subtitle="From real project membership only — never inferred from owner/leader/bidder.">
        {project_evidence.assigned_projects.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No project assignments found for this employee.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {project_evidence.assigned_projects.map((p) => (
              <span key={p.project_id} className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-xs font-bold text-gray-700">{p.title}{p.role ? ` · ${p.role}` : ''}</span>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard icon={<FileText size={18} className="text-primary-500" />} title="Delivery Evidence" subtitle="Expected deliverables, deadlines, actual results — for milestones due or completed within this review period.">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Fact label="Assigned" value={project_evidence.assigned_count} />
          <Fact label="On-Time" value={project_evidence.on_time_count} />
          <Fact label="Missed" value={project_evidence.missed_count} />
          <Fact label="Pending" value={project_evidence.pending_count} />
          <Fact label="Successful" value={project_evidence.successful_count} />
          <Fact label="Failed" value={project_evidence.failed_count} />
          <Fact label="Rework Total" value={project_evidence.rework_total} />
          <Fact label="Evidence Docs" value={project_evidence.evidence_count} />
        </div>

        {(Object.keys(project_evidence.missed_reason_breakdown).length > 0 || Object.keys(project_evidence.issue_classification_breakdown).length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-50">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Missed Reason Breakdown</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(project_evidence.missed_reason_breakdown).map(([k, v]) => (
                  <span key={k} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700">{k.replace(/_/g, ' ')}: {v}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Performance / Capacity Classification</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(project_evidence.issue_classification_breakdown).map(([k, v]) => (
                  <span key={k} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700">{k.replace(/_/g, ' ')}: {v}</span>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 italic mt-1.5">A missed deadline is not automatically a performance issue — see the classification above per milestone.</p>
            </div>
          </div>
        )}

        {project_evidence.milestones.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-50">
            {project_evidence.milestones.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-gray-50/60">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800">{m.title}</span>
                  <span className="text-[11px] text-gray-400">{m.project?.title} · Due {m.delivery.deadline ? new Date(m.delivery.deadline).toLocaleDateString() : '—'} · Actual {m.delivery.actual ? new Date(m.delivery.actual).toLocaleDateString() : '—'}</span>
                  {m.delivery.missed_reason_category && <span className="text-[11px] text-gray-500">Missed reason: {m.delivery.missed_reason_category.replace(/_/g, ' ')}{m.delivery.issue_classification ? ` · Classified: ${m.delivery.issue_classification.replace(/_/g, ' ')}` : ''}</span>}
                  {m.delivery.qa_status && <span className="text-[11px] text-gray-500">QA: {m.delivery.qa_status.replace(/_/g, ' ')}{m.delivery.rework_count != null ? ` · Rework: ${m.delivery.rework_count}` : ''}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${DELIVERY_STYLE[m.delivery.status]}`}>{m.delivery.status.replace('_', ' ')}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${OUTCOME_STYLE[m.outcome]}`}>{m.outcome}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard icon={<Clock size={18} className="text-primary-500" />} title="Attendance / Punctuality" subtitle="From the canonical attendance service — absent days and utilization are left blank where the source data doesn't support them, never fabricated.">
        {attendance ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Fact label="Present Days" value={attendance.present_days} />
            <Fact label="Late Days" value={attendance.late_days} />
            <Fact label="Avg. Late (min)" value={attendance.average_late_minutes} />
            <Fact label="Leave Days" value={attendance.leave_days} />
            <Fact label="Total Hours" value={attendance.total_hours} />
            <Fact label="Avg. Check-in" value={attendance.average_check_in || '—'} />
            <Fact label="Missing Checkouts" value={attendance.missing_checkout_count} />
            <Fact label="Absent Days" value={attendance.absent_days ?? 'Not available'} />
          </div>
        ) : <p className="text-sm text-gray-400 italic">No review period set — attendance cannot be computed.</p>}

        <div className="pt-2 border-t border-gray-50">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Utilization</p>
          {utilization?.available ? (
            <p className="text-sm font-bold text-gray-800">{utilization.utilization_pct}% billable ({utilization.billable_hours}h of {utilization.total_hours}h logged)</p>
          ) : (
            <p className="text-sm text-gray-400 italic">{utilization?.reason || 'Not enough data'}</p>
          )}
        </div>
      </SectionCard>

      <SectionCard icon={<Shield size={18} className="text-primary-500" />} title="Previous Issues / Warnings" subtitle="From compliance/violation records — visible only with the appropriate permission.">
        {warnings.restricted ? (
          <p className="text-sm text-amber-600 italic flex items-center gap-2"><AlertTriangle size={14} /> You do not have permission to view this employee's warning history.</p>
        ) : warnings.records.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No prior warnings on record.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {warnings.records.map((w) => (
              <div key={w.id} className="p-3 rounded-xl bg-amber-50/60 flex flex-col gap-0.5">
                <span className="text-xs font-bold text-gray-800">{w.violation_type.replace(/_/g, ' ')} — {new Date(w.date).toLocaleDateString()} ({w.status})</span>
                {w.manager_remarks && <span className="text-[11px] text-gray-500">Manager: {w.manager_remarks}</span>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard icon={<MessageSquare size={18} className="text-primary-500" />} title="TL / Manager Evidence" subtitle="Attributable, dated evidence entries — not narrative without context.">
        <div className="flex flex-col gap-2">
          {manager_evidence.length === 0 && <p className="text-sm text-gray-400 italic">No manager evidence recorded yet.</p>}
          {manager_evidence.map((e) => (
            <div key={e.id} className="p-3 rounded-xl bg-gray-50/60 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-gray-700">{e.note}</p>
                <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  {`${e.author.first_name || ''} ${e.author.last_name || ''}`.trim()} · {new Date(e.created_at).toLocaleString()}{e.project ? ` · ${e.project.title}` : ''}{e.milestone ? ` · ${e.milestone.title}` : ''}
                  {e.stance !== 'NEUTRAL' && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ${e.stance === 'SUPPORTING' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{e.stance}</span>
                  )}
                </p>
              </div>
              {!isCompleted && (
                <button onClick={() => deleteEvidence.mutate(e.id, { onError: (err: any) => toast.error(err?.message || 'Failed to remove') })} className="text-gray-300 hover:text-red-500 text-xs font-bold shrink-0">Remove</button>
              )}
            </div>
          ))}
        </div>
        {!isCompleted && (
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-50">
            <Textarea value={evidenceNote} onChange={(e) => setEvidenceNote(e.target.value)} placeholder="Add attributable evidence (what happened, when, on which project/milestone)…" className="min-h-[60px] rounded-xl" />
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <SearchableSelect options={STANCE_OPTIONS} value={evidenceStance} onChange={(v) => setEvidenceStance((v as EvidenceStance) || 'NEUTRAL')} clearable={false} />
              </div>
              <Button onClick={handleAddEvidence} disabled={addEvidence.isPending || !evidenceNote.trim()} className="h-11 bg-primary-50 text-primary-600 rounded-xl px-4 text-xs font-bold disabled:opacity-40">Add</Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard icon={<Gauge size={18} className="text-primary-500" />} title="Evidence Completeness" subtitle="Whether enough real evidence exists to support a classification — missing data is never treated as negative evidence.">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase ${COMPLETENESS_STYLE[evidence_completeness.status]}`}>{evidence_completeness.status.replace(/_/g, ' ')}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {Object.entries(evidence_completeness.sources).map(([key, state]) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{key.replace(/_/g, ' ')}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase w-fit ${SOURCE_STATE_STYLE[state]}`}>{state.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-gray-50">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Decision-Support Indicators (facts, not a verdict)</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(decision_indicators).map(([key, present]) => (
              <span key={key} className={`text-[10px] font-bold px-2 py-1 rounded-lg ${present ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-400'}`}>
                {present ? '●' : '○'} {key.replace(/_present$/, '').replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        {missed_attribution.total_classified > 0 && (
          <div className="pt-3 border-t border-gray-50">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Missed Deliveries — By Attribution (never "N missed = N failures")</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Fact label="Performance-Related" value={missed_attribution.performance_related} />
              <Fact label="Capacity-Related" value={missed_attribution.capacity_related} />
              <Fact label="External" value={missed_attribution.external_related} />
              <Fact label="Other" value={missed_attribution.other} />
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard icon={<CheckCircle2 size={18} className="text-primary-500" />} title="Classification & Recommended Action" subtitle="A management judgment — never automatically derived from the evidence above.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Current Classification</label>
            <SearchableSelect options={CLASSIFICATION_OPTIONS} value={review.classification} onChange={handleClassify} placeholder="Not yet classified" disabled={isCompleted} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Recommended Action</label>
            <SearchableSelect options={RECOMMENDED_ACTION_OPTIONS} value={review.recommended_action} onChange={handleRecommend} placeholder="No recommendation yet" disabled={isCompleted} />
          </div>
        </div>
        <p className="text-[11px] text-gray-400 italic">This recommendation does not automatically change salary, issue a warning, or alter this employee's role.</p>

        <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
          {review.status === 'DRAFT' && <Button onClick={() => handleStatusChange('IN_REVIEW')} disabled={updateReview.isPending} className="h-10 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold px-4">Move to In Review</Button>}
          {review.status !== 'COMPLETED' && <Button onClick={() => handleStatusChange('COMPLETED')} disabled={updateReview.isPending} className="h-10 rounded-xl bg-emerald-500 text-white text-xs font-bold px-4">Complete Review</Button>}
          {isCompleted && <span className="text-xs text-gray-400 font-semibold">Completed by {`${review.completer?.first_name || ''} ${review.completer?.last_name || ''}`.trim()} on {review.completed_at ? new Date(review.completed_at).toLocaleDateString() : ''}</span>}
        </div>
      </SectionCard>

      <SectionCard icon={<Award size={18} className="text-primary-500" />} title="Increment Readiness" subtitle="Decision support only — this never approves, rejects, or changes salary/payroll by itself.">
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase ${READINESS_STYLE[increment_readiness.state]}`}>{increment_readiness.state.replace(/_/g, ' ')}</span>
        </div>
        <p className="text-sm text-gray-600">{increment_readiness.reason}</p>

        <div className="pt-3 border-t border-gray-50 flex flex-col gap-3">
          <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Management Decision</label>
          {canDecide ? (
            <SearchableSelect
              options={MANAGEMENT_DECISION_OPTIONS}
              value={review.management_decision}
              onChange={handleRecordDecision}
              placeholder="No decision recorded"
              disabled={review.status !== 'COMPLETED' || recordDecision.isPending}
            />
          ) : (
            <p className="text-sm text-gray-400 italic">
              {review.management_decision ? MANAGEMENT_DECISION_OPTIONS.find((o) => o.value === review.management_decision)?.label || review.management_decision : 'No decision recorded'}
              <span className="block text-[11px] mt-0.5">You do not have permission to record a management decision.</span>
            </p>
          )}
          {review.status !== 'COMPLETED' && canDecide && (
            <p className="text-[11px] text-gray-400 italic">Complete the review above before recording a management decision.</p>
          )}
          {review.management_decision_at && (
            <p className="text-[11px] text-gray-400">Decided by {`${review.decision_maker?.first_name || ''} ${review.decision_maker?.last_name || ''}`.trim()} on {new Date(review.management_decision_at).toLocaleDateString()}</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

export default PerformanceReviewDetailPage;
