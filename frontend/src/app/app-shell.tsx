"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OnboardingGuide } from "@/components/onboarding-guide";
import { useAuth } from "@/lib/auth";
import { registerServiceWorker } from "@/lib/offline";
import { ReactNode } from "react";

const PUBLIC_PATHS = ["/login", "/lp", "/guide", "/scan", "/client"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
}

function AuthGate({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  const pathname = usePathname();

  // Register service worker once on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Public pages render immediately — no loading spinner, no auth check
  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Unauthenticated: redirect to LP (not login)
  if (!token) {
    if (typeof window !== "undefined") {
      window.location.href = "/lp";
    }
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <OfflineBanner />
      <OnboardingGuide />
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 pb-16 md:pb-0">
        <Breadcrumbs />
        <main className="flex-1">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <AuthGate>{children}</AuthGate>
    </Providers>
  );
}
