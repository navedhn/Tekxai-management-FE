import React, { memo, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import AdminTopbar from '@/layouts/features/AdminTopbar';
import { TableSkeleton } from '@/components/skeletons';

// Chat is one shared route for every role (see router.tsx) and intentionally
// keeps its own "Messages" list as its left panel instead of the app's main
// nav Sidebar — so this only adds the top bar (help/notifications/avatar),
// not the full AdminLayout/EmployeeLayout wrapper.
const ChatLayout: React.FC = memo(() => {
  return (
    <div className="min-h-screen bg-[#F5F5FA]">
      <AdminTopbar onMenu={() => {}} fullWidth />
      <main className="pt-[5.5rem] min-h-screen">
        <Suspense fallback={<TableSkeleton rows={8} columns={5} />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
});

export default ChatLayout;
