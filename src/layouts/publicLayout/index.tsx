import React, { memo } from 'react';
import { Outlet } from 'react-router-dom';

const PublicLayout: React.FC = memo(() => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
});

export default PublicLayout;

