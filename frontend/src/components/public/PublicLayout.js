import React from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';

const PublicLayout = () => {
  return (
    <div className="public-theme min-h-screen flex flex-col bg-black text-white">
      <PublicHeader />
      <main className="flex-grow">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};

export default PublicLayout;
