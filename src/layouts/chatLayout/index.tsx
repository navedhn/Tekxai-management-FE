import React, { memo, Suspense, useState, useCallback, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/layouts/features/Sidebar';
import AdminTopbar from '@/layouts/features/AdminTopbar';
import { AnimatePresence, motion } from 'framer-motion';
import { useResponsive } from '@/hooks/useResponsive';
import { RoutePageSkeleton } from '@/components/skeletons';
import { useChatTopbarStore } from '@/stores/chatTopbarStore';
import { useMyPermissions } from '@/services/permissionsService';
import { useSidebarStore } from '@/stores/sidebarStore';

const ChatLayout: React.FC = memo(() => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  const { isMobile } = useResponsive();
  const topbarTitle = useChatTopbarStore((s) => s.title);
  const { data: myPerms } = useMyPermissions();
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);
  const isAdminWorkspace =
    !!myPerms?.is_super_admin || !!myPerms?.permissions?.includes('erp.workspace.access');
  const routePrefix = isAdminWorkspace ? '/admin' : '/employee';

  useEffect(() => {
    const previousCollapsed = useSidebarStore.getState().collapsed;
    setCollapsed(true);
    return () => {
      setCollapsed(previousCollapsed);
    };
  }, [setCollapsed]);

  useEffect(() => {
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
    <div className="min-h-screen bg-(--color-app-bg)">
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

      <Sidebar isOpen={open} onClose={close} />
      <AdminTopbar onMenu={toggle} routePrefix={routePrefix} title={topbarTitle ?? undefined} />
      <main className="pt-topbar lg:pl-sidebar min-h-screen transition-all duration-300 bg-(--color-app-bg)">
        <Suspense fallback={<RoutePageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
});

export default ChatLayout;
