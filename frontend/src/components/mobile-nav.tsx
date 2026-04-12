"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiFetch, cn } from "@/lib/utils";
import { OutdoorModeToggle } from "@/components/outdoor-mode-toggle";
import {
  LayoutDashboard, FolderKanban, Camera, Bell, Menu,
  X, HardHat, Truck, BookOpen, Settings, CalendarCheck,
  ClipboardCheck, Activity, QrCode,
} from "lucide-react";

const navItems = [
  { href: "/today", label: "今日", icon: CalendarCheck },
  { href: "/projects", label: "案件", icon: FolderKanban },
  { href: "/capture", label: "撮影", icon: Camera, isCenter: true },
  { href: "/notifications", label: "通知", icon: Bell },
  { href: "#menu", label: "メニュー", icon: Menu },
];

const menuSheetItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/health", label: "ヘルス", icon: Activity },
  { href: "/approval", label: "承認キュー", icon: ClipboardCheck },
  { href: "/scan", label: "QRスキャン", icon: QrCode },
  { href: "/workers", label: "作業員", icon: HardHat },
  { href: "/subcontractors", label: "協力業者", icon: Truck },
  { href: "/specs", label: "仕様書", icon: BookOpen },
  { href: "/settings", label: "設定", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { token } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: async () => {
      const res = await apiFetch<{ count: number }>("/api/notifications/unread-count", { token: token! });
      return res.count;
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Menu slide-up sheet */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-[60] transition-opacity"
            onClick={() => setMenuOpen(false)}
          />
          {/* Sheet */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] pb-safe animate-slide-up">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">メニュー</h3>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {menuSheetItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors",
                    isActive(item.href)
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center",
                    isActive(item.href) ? "bg-blue-100" : "bg-white"
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
            {/* Outdoor mode toggle in menu */}
            <div className="px-4 pb-4">
              <OutdoorModeToggle
                showLabel={true}
                className="w-full justify-center"
              />
            </div>
          </div>
        </>
      )}

      {/* Bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-white/95 backdrop-blur-lg border-t border-gray-200 pb-safe">
          <div className="flex items-end justify-around px-2 pt-1">
            {navItems.map((item) => {
              const active = item.href !== "#menu" && isActive(item.href);
              const isCenter = item.isCenter;
              const isNotification = item.href === "/notifications";
              const isMenu = item.href === "#menu";

              /* Center camera FAB */
              if (isCenter) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center -mt-4"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-300/50 flex items-center justify-center mb-0.5 active:scale-95 transition-transform">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-blue-600">{item.label}</span>
                  </Link>
                );
              }

              /* Menu button */
              if (isMenu) {
                return (
                  <button
                    key="menu"
                    onClick={() => setMenuOpen(true)}
                    className="flex flex-col items-center py-2 px-3 text-gray-400"
                  >
                    <Menu className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px]">{item.label}</span>
                  </button>
                );
              }

              /* Regular items */
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center py-2 px-3 transition-colors",
                    active ? "text-blue-600" : "text-gray-400"
                  )}
                >
                  <div className="relative">
                    <item.icon
                      className={cn("w-5 h-5 mb-0.5", active && "stroke-[2.5]")}
                    />
                    {isNotification && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center px-1 font-bold animate-pulse">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px]",
                    active ? "font-bold" : "font-normal"
                  )}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* CSS for slide-up animation and safe area */}
      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </>
  );
}
