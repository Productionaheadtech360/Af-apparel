"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { Header } from "@/components/layout/Header";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated()) {
        router.replace("/login");
      } else if (!isAdmin()) {
        router.replace("/account");
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated() || !isAdmin()) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminSidebar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </>
  );
}
