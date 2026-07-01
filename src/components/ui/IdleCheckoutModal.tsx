/**
 * Modal shown when a user returns to the app after an idle auto-checkout.
 * Reads from localStorage flag set by useIdleAutoCheckout.
 * The user can either check back in (triggers clock-in) or dismiss.
 */

import React, { useEffect, useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Clock, AlertCircle } from 'lucide-react';
import { hasIdleCheckoutFlag, clearIdleCheckoutFlag } from '@/utils/attendanceAutoCheckout';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { Button } from '@/components/ui/Button';

interface IdleCheckoutModalProps {
  /** Only show the modal when the user is authenticated */
  isAuthenticated: boolean;
  /** Idle timeout in minutes, used for display text */
  idleTimeoutMinutes?: number;
}

const IdleCheckoutModal: React.FC<IdleCheckoutModalProps> = ({ isAuthenticated, idleTimeoutMinutes = 15 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (isAuthenticated && hasIdleCheckoutFlag()) {
      setIsOpen(true);
    }
  }, [isAuthenticated]);

  const clockInMutation = useMutation({
    mutationFn: () =>
      apiRequest(API_ENDPOINTS.TIMESHEET.CLOCK_IN, {
        method: 'POST',
        body: JSON.stringify({ note: 'Re-check-in after idle auto-checkout' }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheet', 'today'] });
      qc.invalidateQueries({ queryKey: ['timesheet', 'weekly'] });
      setCheckedIn(true);
    },
  });

  const handleDismiss = () => {
    clearIdleCheckoutFlag();
    setIsOpen(false);
  };

  const handleCheckIn = async () => {
    await clockInMutation.mutateAsync();
    clearIdleCheckoutFlag();
    setTimeout(() => setIsOpen(false), 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 flex flex-col gap-5">
        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 mx-auto">
          <AlertCircle className="text-amber-500" size={28} />
        </div>

        {/* Copy */}
        <div className="text-center flex flex-col gap-2">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            You were automatically checked out
          </h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">
            Your attendance session was closed after {idleTimeoutMinutes} {idleTimeoutMinutes === 1 ? 'minute' : 'minutes'} of inactivity in the app.
            Would you like to check in again to continue tracking your time?
          </p>
          <p className="text-xs text-amber-600 font-semibold bg-amber-50 rounded-lg px-3 py-2 mt-1">
            Note: this tracks inactivity within the Tekxai app tab only.
          </p>
        </div>

        {/* CTA */}
        {checkedIn ? (
          <div className="flex items-center justify-center gap-2 text-green-600 font-bold py-2">
            <Clock size={18} />
            <span>Checked in successfully!</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            <Button
              variant="primary"
              fullWidth
              className="h-12 rounded-xl font-black shadow-lg shadow-primary-100"
              onClick={handleCheckIn}
              loading={clockInMutation.isPending}
            >
              Check In Again
            </Button>
            <Button
              variant="outline"
              fullWidth
              className="h-12 rounded-xl"
              onClick={handleDismiss}
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdleCheckoutModal;
