"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn, apiFetch } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, FolderKanban, Camera, BookOpen, Settings, LogOut,
  Building2, BarChart3, HardHat, Truck, Bell, Search,
  ChevronLeft, ChevronRight, Shield, ClipboardCheck, Activity,
  CalendarCheck, Wrench, SearchIcon, TrendingUp,
} from "lucide-react";
import { OutdoorModeToggle } from "@/components/outdoor-mode-toggle";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
}

const mainItems: NavItem[] = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/today", label: "今日のワークフロー", icon: CalendarCheck },
  { href: "/projects", label: "案件管理", icon: FolderKanban },
  { href: "/capture", label: "写真撮影", icon: Camera },
  { href: "/health", label: "プロジェクトヘルス", icon: Activity },
  { href: "/approval", label: "承認キュー", icon: ClipboardCheck },
];

const orgItems: NavItem[] = [
  { href: "/workers", label: "作業員管理", icon: HardHat },
  { href: "/subcontractors", label: "協力業者", icon: Truck },
  { href: "/equipment", label: "車両・重機", icon: Wrench },
  { href: "/search", label: "横断検索", icon: SearchIcon },
  { href: "/specs", label: "仕様書", icon: BookOpen },
];

const settingsItems: NavItem[] = [
  { href: "/settings", label: "設定", icon: Settings },
];

const adminItems: NavItem[] = [
  { href: "/admin", label: "SaaS管理", icon: BarChart3 },
  { href: "/admin/dashboard", label: "横断ダッシュボード", icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, token, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filterItems = (items: NavItem[]) => {
    if (!searchQuery.trim()) return items;
    return items.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  const roleBadge = (role?: string) => {
    if (!role) return null;
    const map: Record<string, { label: string; cls: string }> = {
      admin: { label: "管理者", cls: "bg-purple-500/20 text-purple-300" },
      manager: { label: "マネージャー", cls: "bg-blue-500/20 text-blue-300" },
      worker: { label: "作業員", cls: "bg-slate-500/20 text-slate-300" },
    };
    const info = map[role] || { label: role, cls: "bg-slate-500/20 text-slate-300" };
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${info.cls}`}>
        {info.label}
      </span>
    );
  };

  const renderSection = (title: string, items: NavItem[], activeColor = "bg-blue-600") => {
    const filtered = filterItems(items);
    if (filtered.length === 0) return null;
    return (
      <div>
        {!collapsed && (
          <div className="px-3 pt-4 pb-1.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{title}</p>
          </div>
        )}
        {collapsed && <div className="pt-3" />}
        <div className="space-y-0.5">
          {filtered.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative",
                  active
                    ? `${activeColor} text-white shadow-lg shadow-blue-600/20`
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 flex-shrink-0 transition-transform duration-200",
                  !active && "group-hover:scale-110"
                )} />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-medium">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const notificationVisible =
    !searchQuery.trim() || "通知".includes(searchQuery.toLowerCase());

  return (
    <aside
      className={cn(
        "bg-slate-900 text-white flex flex-col min-h-screen transition-all duration-300 relative",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 z-10 w-6 h-6 bg-slate-700 hover:bg-slate-600 border-2 border-slate-900 rounded-full flex items-center justify-center transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-slate-300" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-slate-300" />
        )}
      </button>

      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-bold truncate">工事管理</h1>
              <p className="text-[11px] text-slate-500 truncate">{user?.tenant_name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="メニューを検索..."
              className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-300 placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        {renderSection("メイン", mainItems)}
        {renderSection("組織管理", orgItems)}

        {/* Notification - special item */}
        {notificationVisible && (
          <div>
            {!collapsed && (
              <div className="px-3 pt-4 pb-1.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">通知</p>
              </div>
            )}
            {collapsed && <div className="pt-3" />}
            <Link
              href="/notifications"
              title={collapsed ? "通知" : undefined}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative",
                isActive("/notifications")
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
              )}
            >
              <div className="relative flex-shrink-0">
                <Bell className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  !isActive("/notifications") && "group-hover:scale-110"
                )} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center px-1 font-bold animate-pulse shadow-lg shadow-red-500/30">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1">通知</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-semibold">
                      {unreadCount}件
                    </span>
                  )}
                </>
              )}
            </Link>
          </div>
        )}

        {renderSection("管理", settingsItems)}

        {user?.role === "admin" && renderSection("SaaS管理", adminItems, "bg-purple-600")}
      </nav>

      {/* Outdoor mode toggle */}
      <div className="px-2 py-2 border-t border-slate-700/50">
        {collapsed ? (
          <OutdoorModeToggle showLabel={false} className="w-full justify-center px-2" />
        ) : (
          <OutdoorModeToggle showLabel={true} className="w-full" />
        )}
      </div>

      {/* User section */}
      <div className="border-t border-slate-700/50 p-3">
        <div className={cn(
          "flex items-center gap-3 rounded-xl p-2.5 hover:bg-slate-800/80 transition-colors",
          collapsed && "justify-center"
        )}>
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-lg shadow-emerald-600/20">
            {userInitial}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                {roleBadge(user?.role)}
              </div>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              title="ログアウト"
              className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
