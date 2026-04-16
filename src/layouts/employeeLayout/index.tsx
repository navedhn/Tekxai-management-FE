import React, { memo, useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/layouts/features/Sidebar';
import AdminTopbar from '@/layouts/features/AdminTopbar';
import { AnimatePresence, motion } from 'framer-motion';
import PageWrapper from '@/components/layout/PageWrapper';
import { useLocation } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import ChatFloatingButton from '@/components/ui/ChatFloatingButton';

const EmployeeLayout: React.FC = memo(() => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const { isMobile } = useResponsive();

  const location = useLocation();

  // Handle body scroll lock on mobile
  React.useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = open ? 'hidden' : 'unset';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open, isMobile]);

  return (
    <div className="min-h-screen bg-[#FDFDFF]">
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className={"fixed inset-0 bg-black/20 backdrop-blur-md z-105 lg:hidden"}
          />
        )}
      </AnimatePresence>

      <Sidebar isOpen={open} onClose={close} />
      <AdminTopbar onMenu={toggle} routePrefix="/employee" />
      <main className="pt-[5.5rem] lg:pl-sidebar min-h-screen transition-all duration-300  bg-[#F5F5FA]">
        <div className="p-6 lg:px-4 py-8 max-w-[1800px] mx-auto bg-[#F5F5FA]">
          <AnimatePresence mode="wait">
            <PageWrapper key={location.pathname}>
              <Outlet />
            </PageWrapper>
          </AnimatePresence>
        </div>
      </main>
      <ChatFloatingButton />
    </div>
  );
});

export default EmployeeLayout;
