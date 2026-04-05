"use client";

import { useAuth } from "@/lib/auth";
import { Building2, User, Shield } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

      <div className="space-y-6">
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" /> テナント情報
          </h2>
          <div className="text-sm">
            <span className="text-gray-500">会社名</span>
            <p className="font-medium">{user?.tenant_name}</p>
          </div>
        </div>

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
