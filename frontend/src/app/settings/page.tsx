"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Building2, User, Shield, Bell, BellOff, Sun, Globe } from "lucide-react";
import {
  requestNotificationPermission,
  useNotificationPermission,
  getNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from "@/lib/push-notifications";
import { OutdoorModeToggle } from "@/components/outdoor-mode-toggle";
import { cn } from "@/lib/utils";
import { useLocale, LOCALE_LABELS, type Locale } from "@/lib/i18n";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500",
        checked ? "bg-blue-600" : "bg-gray-300",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const notifPermission = useNotificationPermission();
  const [settings, setSettings] = useState<NotificationSettings>(() =>
    getNotificationSettings()
  );
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [locale, setLocale] = useLocale();

  useEffect(() => {
    saveNotificationSettings(settings);
  }, [settings]);

  const handleEnablePush = async () => {
    setRequestingPermission(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        setSettings((prev) => ({ ...prev, pushEnabled: true }));
      } else {
        setSettings((prev) => ({ ...prev, pushEnabled: false }));
      }
    } finally {
      setRequestingPermission(false);
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const pushBlocked = notifPermission === "denied";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

      <div className="space-y-6">
        {/* User info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" /> ユーザー情報
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">名前</span>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <span className="text-gray-500">メール</span>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <span className="text-gray-500">権限</span>
              <p className="font-medium">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Tenant info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" /> テナント情報
          </h2>
          <div className="text-sm">
            <span className="text-gray-500">会社名</span>
            <p className="font-medium">{user?.tenant_name}</p>
          </div>
        </div>

        {/* Push notification settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" /> 通知設定
          </h2>

          {pushBlocked && (
            <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <BellOff className="w-4 h-4 flex-shrink-0" />
              <span>
                ブラウザの設定で通知がブロックされています。ブラウザの設定から通知を許可してください。
              </span>
            </div>
          )}

          <div className="space-y-4">
            {/* Master push toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  プッシュ通知を有効にする
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {notifPermission === "granted"
                    ? "通知が許可されています"
                    : notifPermission === "denied"
                    ? "通知がブロックされています"
                    : "通知の許可が必要です"}
                </p>
              </div>
              {notifPermission !== "granted" ? (
                <button
                  onClick={handleEnablePush}
                  disabled={requestingPermission || pushBlocked}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {requestingPermission ? "確認中..." : "許可する"}
                </button>
              ) : (
                <Toggle
                  checked={settings.pushEnabled}
                  onChange={(v) => updateSetting("pushEnabled", v)}
                />
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Approval requests */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  承認リクエスト通知
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  承認待ちの書類・日報が届いた時
                </p>
              </div>
              <Toggle
                checked={settings.approvalRequests}
                onChange={(v) => updateSetting("approvalRequests", v)}
                disabled={!settings.pushEnabled || notifPermission !== "granted"}
              />
            </div>

            {/* Deadline alerts */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  期限アラート通知
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  書類提出期限・資格有効期限が近い時
                </p>
              </div>
              <Toggle
                checked={settings.deadlineAlerts}
                onChange={(v) => updateSetting("deadlineAlerts", v)}
                disabled={!settings.pushEnabled || notifPermission !== "granted"}
              />
            </div>

            {/* Comments */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  コメント通知
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  自分が関わる案件にコメントが追加された時
                </p>
              </div>
              <Toggle
                checked={settings.comments}
                onChange={(v) => updateSetting("comments", v)}
                disabled={!settings.pushEnabled || notifPermission !== "granted"}
              />
            </div>
          </div>
        </div>

        {/* Outdoor mode */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sun className="w-5 h-5" /> 表示設定
          </h2>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-800">屋外モード</p>
              <p className="text-xs text-gray-500 mt-0.5">
                フォント拡大・高コントラスト・大きいタッチターゲット (60px以上)
              </p>
            </div>
            <OutdoorModeToggle showLabel={false} />
          </div>
        </div>

        {/* Language selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" /> 言語設定 / Language
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([code, label]) => (
              <button
                key={code}
                onClick={() => setLocale(code)}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                  locale === code
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                )}
              >
                {label}
                {locale === code && <span className="text-xs opacity-80">✓</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            表示言語を切り替えます。ページ再読み込みは不要です。
          </p>
        </div>

        {/* System info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" /> システム情報
          </h2>
          <div className="text-sm space-y-2 text-gray-600">
            <p>工事管理SaaS v1.0.0</p>
            <p>基準仕様書: 公共建築工事標準仕様書（建築工事編）令和7年版</p>
          </div>
        </div>
      </div>
    </div>
  );
}
