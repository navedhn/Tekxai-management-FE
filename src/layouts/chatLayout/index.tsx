import React, { memo, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import AdminTopbar from '@/layouts/features/AdminTopbar';
import { TableSkeleton } from '@/components/skeletons';
import { useChatTopbarStore } from '@/stores/chatTopbarStore';

const ChatLayout: React.FC = memo(() => {

  const topbarTitle = useChatTopbarStore((s) => s.title);
  return (
    <div className="min-h-screen bg-[#F5F5FA]">
      <AdminTopbar onMenu={() => {}} fullWidth title={topbarTitle ?? undefined} />
      <main className="pt-[5.5rem] min-h-screen">
        <Suspense fallback={<TableSkeleton rows={8} columns={5} />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
});

export default ChatLayout;
