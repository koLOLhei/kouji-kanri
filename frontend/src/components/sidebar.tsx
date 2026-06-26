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
  CalendarCheck, Wrench, SearchIcon, TrendingUp, Users,
  FileText, Receipt, ClipboardList, Wallet,
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
  { href: "/company", label: "全社ダッシュボード", icon: BarChart3 },
];

const orgItems: NavItem[] = [
  { href: "/workers", label: "作業員管理", icon: HardHat },
  { href: "/subcontractors", label: "協力業者", icon: Truck },
  { href: "/equipment", label: "車両・重機", icon: Wrench },
  { href: "/search", label: "横断検索", icon: SearchIcon },
  { href: "/crm", label: "顧客管理(CRM)", icon: Users },
  { href: "/facilities", label: "施設インフラDB", icon: Building2 },
  { href: "/sales", label: "受注パイプライン", icon: BarChart3 },
  { href: "/degradation-surveys", label: "劣化診断(現調)", icon: ClipboardList },
  { href: "/estimates", label: "見積書", icon: ClipboardCheck },
  { href: "/contracts", label: "契約書", icon: Shield },
  { href: "/ar", label: "売掛金・入金", icon: Wallet },
  { href: "/tasks", label: "タスク", icon: CalendarCheck },
  { href: "/specs", label: "仕様書", icon: BookOpen },
];

const settingsItems: NavItem[] = [
  { href: "/settings", label: "設定", icon: Settings },
  { href: "/settings/work-types", label: "工事種別マスタ", icon: Wrench },
  { href: "/settings/estimate-conditions", label: "見積条件テンプレ", icon: FileText },
  { href: "/settings/invoice-header", label: "適格請求書設定", icon: Receipt },
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
    staleTime: 60000,
    refetchInterval: 60000,
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
    const map: Record<string, string> = {
      admin: "管理者",
      manager: "マネージャー",
      worker: "作業員",
    };
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-white/10 text-gray-300">
        {map[role] || role}
      </span>
    );
  };

  const renderSection = (title: string, items: NavItem[]) => {
    const filtered = filterItems(items);
    if (filtered.length === 0) return null;
    return (
      <div>
        {!collapsed && (
          <div className="px-3 pt-5 pb-2">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.2em]">{title}</p>
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
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative",
                  active
                    ? "bg-white text-gray-900"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700 font-medium">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {collapsed && item.badge != null && item.badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
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
      aria-label="サイドバーナビゲーション"
      className={cn(
        "bg-gray-900 text-white flex flex-col min-h-screen transition-all duration-300 relative",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
        aria-expanded={!collapsed}
        className="absolute -right-3 top-7 z-10 w-6 h-6 bg-gray-700 hover:bg-gray-600 border-2 border-gray-900 rounded-full flex items-center justify-center transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-gray-200" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-gray-200" />
        )}
      </button>

      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-gray-900" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate">工事管理</h1>
              <p className="text-[11px] text-gray-500 truncate">{user?.tenant_name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="メニューを検索..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav role="navigation" aria-label="メインナビゲーション" className="flex-1 px-2 overflow-y-auto">
        {renderSection("メイン", mainItems)}
        {renderSection("組織管理", orgItems)}

        {/* Notification - special item */}
        {notificationVisible && (
          <div>
            {!collapsed && (
              <div className="px-3 pt-5 pb-2">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.2em]">通知</p>
              </div>
            )}
            {collapsed && <div className="pt-3" />}
            <Link
              href="/notifications"
              title={collapsed ? "通知" : undefined}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative",
                isActive("/notifications")
                  ? "bg-white text-gray-900"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="relative flex-shrink-0">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-600 text-white text-[9px] rounded-full flex items-center justify-center px-1 font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1">通知</span>
                  {unreadCount > 0 && (
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                      isActive("/notifications")
                        ? "bg-red-600 text-white"
                        : "bg-red-600/20 text-red-300"
                    )}>
                      {unreadCount}件
                    </span>
                  )}
                </>
              )}
            </Link>
          </div>
        )}

        {renderSection("管理", settingsItems)}

        {user?.role === "admin" && renderSection("SaaS管理", adminItems)}
      </nav>

      {/* Outdoor mode toggle */}
      <div className="px-2 py-2 border-t border-white/10">
        {collapsed ? (
          <OutdoorModeToggle showLabel={false} className="w-full justify-center px-2" />
        ) : (
          <OutdoorModeToggle showLabel={true} className="w-full" />
        )}
      </div>

      {/* User section */}
      <div className="border-t border-white/10 p-3">
        <div className={cn(
          "flex items-center gap-3 rounded-lg p-2.5 hover:bg-white/5 transition-colors",
          collapsed && "justify-center"
        )}>
          <div className="w-9 h-9 rounded-full bg-white text-gray-900 flex items-center justify-center flex-shrink-0 text-sm font-bold">
            {userInitial}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                {roleBadge(user?.role)}
              </div>
              <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              title="ログアウト"
              aria-label="ログアウト"
              className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
