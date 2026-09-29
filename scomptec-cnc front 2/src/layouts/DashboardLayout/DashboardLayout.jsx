import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar/Sidebar";
import Header from "../../components/Header/Header";
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";
import ToastCenter from "../../components/ToastCenter/ToastCenter";
import ConnectionNotice from "../../components/ConnectionNotice/ConnectionNotice";
import { usePreferences } from "../../services/preferences";

export default function DashboardLayout() {
  const preferences = usePreferences();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div data-reduce-motion={preferences.reduceMotion} className="relative flex min-h-screen bg-base-bg font-sans text-text-primary selection:bg-accent/20 selection:text-accent-100">
      {/* Glow highlight top background */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-gradient-to-b from-accent/[0.04] via-transparent to-transparent" />
      
      <ToastCenter />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <ConnectionNotice />
        <main className="relative mx-auto w-full max-w-7xl flex-1 px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mb-4 sm:mb-6"><Breadcrumb /></div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
