"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OnboardingGuide } from "@/components/onboarding-guide";
import { useAuth } from "@/lib/auth";
import { registerServiceWorker } from "@/lib/offline";

const PUBLIC_PATHS = ["/login", "/lp", "/guide", "/scan", "/client", "/forgot-password", "/reset-password"];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
}

function AuthGate({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;

    // Unauthenticated on a private path: redirect to LP
    if (!token && !isPublicPath(pathname)) {
      router.push("/lp");
    }
  }, [token, loading, pathname, mounted, router]);

  // Prevent hydration mismatch by not rendering anything auth-dependent until mounted
  if (!mounted) {
    return null;
  }

  // Public pages render immediately (post-mount)
  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }

  // Show loading spinner while determining auth state for private pages
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Final check for private pages: if still no token, suppress render until redirect happens
  if (!token) {
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
        {/* D33: id="main-content" anchors the skip-link in layout.tsx */}
        <main id="main-content" className="flex-1">{children}</main>
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
