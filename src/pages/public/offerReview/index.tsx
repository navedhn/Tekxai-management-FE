import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Briefcase, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import {
  useGetPublicOfferQuery,
  useAcceptPublicOfferMutation,
  useRejectPublicOfferMutation,
} from '@/services/onboardingOffersPublicService';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-center gap-2 mb-6">
        <span className="text-lg font-black text-primary-700 tracking-tight">TEKXAI HR</span>
      </div>
      {children}
    </div>
  </div>
);

const StateCard: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; tone?: 'error' | 'success' }> = ({ icon, title, subtitle, tone = 'error' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center gap-4">
    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${tone === 'success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
      {icon}
    </div>
    <div>
      <h2 className="text-xl font-black text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 font-medium mt-2 max-w-sm">{subtitle}</p>
    </div>
  </div>
);

const formatSalary = (salary: any) => {
  if (salary === null || salary === undefined || salary === '') return null;
  const n = Number(salary);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(salary);
};

const formatDate = (d: any) => {
  if (!d) return null;
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? String(d) : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const OfferReviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { data, isLoading, isError } = useGetPublicOfferQuery(token);
  const acceptMutation = useAcceptPublicOfferMutation(token);
  const rejectMutation = useRejectPublicOfferMutation(token);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState('');
  const [justAccepted, setJustAccepted] = useState(false);
  const [justRejected, setJustRejected] = useState(false);

  const payload = (data as any)?.payload;
  const offer = payload?.offer;
  const candidate = payload?.candidate;

  if (!token) {
    return (
      <Shell>
        <StateCard
          icon={<AlertTriangle size={28} />}
          title="Link Invalid"
          subtitle="This offer link is missing required information. Please use the link from your invitation email, or contact HR."
        />
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading your offer…</p>
        </div>
      </Shell>
    );
  }

  if (isError || !offer) {
    return (
      <Shell>
        <StateCard
          icon={<AlertTriangle size={28} />}
          title="Link Invalid or Expired"
          subtitle="This offer link isn't valid — it may have expired or there's no offer currently available for review. Please contact HR for assistance."
        />
      </Shell>
    );
  }

  const isAccepted = justAccepted || offer.status === 'ACCEPTED';
  const isRejected = justRejected || offer.status === 'REJECTED';

  if (isAccepted) {
    return (
      <Shell>
        <StateCard
          tone="success"
          icon={<CheckCircle2 size={28} />}
          title="Welcome Aboard!"
          subtitle={`Thank you for accepting the offer for ${offer.position || 'this position'}. Your onboarding has already started on our end — HR will be in touch shortly with next steps.`}
        />
      </Shell>
    );
  }

  if (isRejected) {
    return (
      <Shell>
        <StateCard
          icon={<XCircle size={28} />}
          title="Offer Declined"
          subtitle="You've declined this offer. Thank you for letting us know — we wish you the best. If this was a mistake, please contact HR."
        />
      </Shell>
    );
  }

  const salary = formatSalary(offer.salary);
  const startDate = formatDate(offer.start_date);

  const handleAccept = () => {
    acceptMutation.mutate(undefined, { onSuccess: () => setJustAccepted(true) });
  };

  const handleReject = () => {
    rejectMutation.mutate({ reason: reason.trim() || undefined }, { onSuccess: () => setJustRejected(true) });
  };

  return (
    <Shell>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-black text-gray-900">Offer Letter{offer.position ? ` — ${offer.position}` : ''}</h1>
          <p className="text-xs text-gray-400 mt-1">
            Prepared for {candidate?.name || 'you'}{candidate?.email ? ` · ${candidate.email}` : ''}
          </p>
        </div>

        <div className="p-6 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {offer.position && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Position</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{offer.position}</p>
            </div>
          )}
          {salary && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Salary</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{salary}</p>
            </div>
          )}
          {startDate && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Start Date</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{startDate}</p>
            </div>
          )}
          {offer.employment_type && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Employment Type</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{offer.employment_type}</p>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 text-gray-900 font-black mb-4 text-sm">
            <Briefcase size={16} className="text-primary-500" />
            <span>Offer Letter</span>
          </div>
          <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-6 border border-gray-100 max-h-[50vh] overflow-y-auto">
            {offer.letter_content}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          {!showRejectForm ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                disabled={acceptMutation.isPending}
                onClick={handleAccept}
                className="flex-1 h-11 px-6 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40"
              >
                {acceptMutation.isPending ? 'Accepting…' : 'Accept Offer'}
              </button>
              <button
                disabled={rejectMutation.isPending}
                onClick={() => setShowRejectForm(true)}
                className="flex-1 h-11 px-6 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-40"
              >
                Decline Offer
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-400">Optionally, let us know why you're declining (this is not required).</p>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white resize-none"
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  disabled={rejectMutation.isPending}
                  onClick={handleReject}
                  className="flex-1 h-11 px-6 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-40"
                >
                  {rejectMutation.isPending ? 'Submitting…' : 'Confirm Decline'}
                </button>
                <button
                  disabled={rejectMutation.isPending}
                  onClick={() => setShowRejectForm(false)}
                  className="h-11 px-6 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {(acceptMutation.isError || rejectMutation.isError) && (
            <p className="text-xs text-red-500 mt-3 font-medium">
              {((acceptMutation.error || rejectMutation.error) as any)?.message || 'Something went wrong — please try again or contact HR.'}
            </p>
          )}
        </div>
      </div>
    </Shell>
  );
};

export default OfferReviewPage;
