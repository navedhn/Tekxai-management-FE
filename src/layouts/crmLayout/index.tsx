import React, { memo, Suspense, useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import CRMSidebar from '@/layouts/features/CRMSidebar';
import AdminTopbar from '@/layouts/features/AdminTopbar';
import PageWrapper from '@/components/layout/PageWrapper';
import { useResponsive } from '@/hooks/useResponsive';
import { MarketingTeamProvider } from '@/contexts/MarketingTeamContext';
import { TableSkeleton } from '@/components/skeletons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import { useIdleAutoCheckout } from '@/hooks/useIdleAutoCheckout';
import IdleCheckoutModal from '@/components/ui/IdleCheckoutModal';

const CRMLayout: React.FC = memo(() => {
  const [open, setOpen] = useState(false);
  const { isLoggedIn } = useAuthStore();
  const qc = useQueryClient();

  const { data: todayStatus } = useQuery({
    queryKey: ['timesheet', 'today'],
    queryFn: async () => {
      const res = await apiRequest<any>(API_ENDPOINTS.TIMESHEET.TODAY);
      return res?.payload || { clocked_in: false, clocked_out: false, entry: null };
    },
    enabled: isLoggedIn,
    refetchInterval: 60_000,
  });

  const isActiveSession = !!(todayStatus?.clocked_in && !todayStatus?.clocked_out);

  useIdleAutoCheckout({
    isClockdIn: isActiveSession,
    onAutoCheckout: () => {
      qc.invalidateQueries({ queryKey: ['timesheet', 'today'] });
      qc.invalidateQueries({ queryKey: ['timesheet', 'weekly'] });
    },
  });

  const toggle = useCallback(() => setOpen(v => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const location = useLocation();
  const { isMobile } = useResponsive();

  React.useEffect(() => {
    if (isMobile) document.body.style.overflow = open ? 'hidden' : 'unset';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [open, isMobile]);

  return (
    <MarketingTeamProvider>
      <div className="min-h-screen bg-[#FDFDFF]">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 bg-black/20 backdrop-blur-md z-105 lg:hidden"
            />
          )}
        </AnimatePresence>

        <CRMSidebar isOpen={open} onClose={close} />
        <AdminTopbar onMenu={toggle} routePrefix="/crm" workspace="CRM" />
        <main className="pt-[5.5rem] lg:pl-[280px] min-h-screen transition-all duration-300 bg-[#F5F5FA]">
          <div className="p-6 lg:px-4 py-8 max-w-[1800px] mx-auto bg-[#F5F5FA]">
            <AnimatePresence mode="wait">
              <PageWrapper key={location.pathname}>
                <Suspense fallback={<TableSkeleton rows={8} columns={5} />}>
                  <Outlet />
                </Suspense>
              </PageWrapper>
            </AnimatePresence>
          </div>
        </main>
        <IdleCheckoutModal isAuthenticated={isLoggedIn} />
      </div>
    </MarketingTeamProvider>
  );
});

export default CRMLayout;
