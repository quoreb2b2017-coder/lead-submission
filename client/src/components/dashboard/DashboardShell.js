"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import Footer from "@/components/dashboard/Footer";
import { FullPageSpinner } from "@/components/Spinner";

export default function DashboardShell({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("sidebar-collapsed") === "1"
  );

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  const toggleCollapse = () =>
    setCollapsed((c) => {
      localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      return !c;
    });

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (loading || !user) return <FullPageSpinner />;

  return (
          <div className="min-h-screen bg-[#f6f7fb]">
        <Sidebar
          open={sidebarOpen}
          collapsed={collapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={toggleCollapse}
          onLogout={handleLogout}
          user={user}
        />
        <div className={`flex min-h-screen flex-col transition-[padding] duration-300 ${collapsed ? "lg:pl-[72px]" : "lg:pl-60"}`}>
          <Topbar user={user} onMenuClick={() => setSidebarOpen(true)} onLogout={handleLogout} />
          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-5 sm:py-5 xl:px-7 xl:py-6">{children}</main>
          <Footer />
        </div>
      </div>
  );
}
