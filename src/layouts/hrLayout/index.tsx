import React, { memo, Suspense, useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import HRSidebar from '@/layouts/features/HRSidebar';
import AdminTopbar from '@/layouts/features/AdminTopbar';
import PageWrapper from '@/components/layout/PageWrapper';
import { useResponsive } from '@/hooks/useResponsive';
import { TableSkeleton } from '@/components/skeletons';
import ChatFloatingButton from '@/components/ui/ChatFloatingButton';

const HRLayout: React.FC = memo(() => {
  const [open, setOpen] = useState(false);

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

      <HRSidebar isOpen={open} onClose={close} />
      <AdminTopbar onMenu={toggle} routePrefix="/hr" workspace="HR" />
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
      <ChatFloatingButton />
    </div>
  );
});

export default HRLayout;
