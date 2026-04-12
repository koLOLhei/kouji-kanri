"use client";

export type Locale = "ja" | "en" | "vi" | "zh";

export const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文",
};

const translations: Record<Locale, Record<string, string>> = {
  ja: {
    // Navigation
    "nav.dashboard": "ダッシュボード",
    "nav.projects": "案件一覧",
    "nav.daily_reports": "日報",
    "nav.safety": "安全管理",
    "nav.photos": "写真撮影",
    "nav.workers": "作業員",
    "nav.settings": "設定",
    "nav.subcontractors": "協力業者",
    "nav.equipment": "車両・重機",
    "nav.notifications": "通知",
    "nav.approval": "承認キュー",
    "nav.health": "ヘルス",
    "nav.today": "今日の作業",
    "nav.specs": "仕様書",
    "nav.search": "検索",
    "nav.admin": "管理",
    // Actions
    "action.save": "保存",
    "action.cancel": "キャンセル",
    "action.delete": "削除",
    "action.submit": "提出",
    "action.approve": "承認",
    "action.reject": "却下",
    "action.edit": "編集",
    "action.add": "追加",
    "action.create": "作成",
    "action.upload": "アップロード",
    "action.download": "ダウンロード",
    "action.generate": "生成",
    "action.close": "閉じる",
    "action.confirm": "確認",
    "action.back": "戻る",
    "action.next": "次へ",
    "action.search": "検索",
    "action.filter": "絞り込み",
    "action.export": "エクスポート",
    "action.import": "インポート",
    "action.resolve": "是正完了",
    "action.verify": "検証済み",
    // Statuses
    "status.draft": "下書き",
    "status.submitted": "提出済",
    "status.approved": "承認済",
    "status.rejected": "却下",
    "status.pending": "保留中",
    "status.active": "進行中",
    "status.completed": "完了",
    "status.cancelled": "キャンセル",
    "status.open": "未対応",
    "status.in_progress": "対応中",
    "status.resolved": "是正完了",
    "status.verified": "検証済み",
    // Common labels
    "label.project": "案件",
    "label.date": "日付",
    "label.name": "名前",
    "label.title": "タイトル",
    "label.description": "説明",
    "label.status": "ステータス",
    "label.amount": "金額",
    "label.notes": "備考",
    "label.location": "場所",
    "label.assigned_to": "担当者",
    "label.due_date": "期限",
    "label.severity": "重要度",
    "label.type": "種別",
    "label.total": "合計",
    "label.loading": "読み込み中...",
    "label.error": "エラーが発生しました",
    "label.no_data": "データがありません",
    "label.required": "必須",
    "label.optional": "任意",
    // Severity levels
    "severity.minor": "軽微",
    "severity.major": "重大",
    "severity.critical": "緊急",
    // Safety AI
    "safety.ai_score": "AI安全スコア",
    "safety.risk_forecast": "7日間リスク予測",
    "safety.risk_low": "低リスク",
    "safety.risk_medium": "中リスク",
    "safety.risk_high": "高リスク",
    "safety.risk_critical": "緊急リスク",
    // Punch list
    "punch.title": "パンチリスト",
    "punch.new_item": "指摘事項を登録",
    "punch.location": "場所",
    "punch.reported_by": "報告者",
    "punch.before_photo": "指摘時写真",
    "punch.after_photo": "是正後写真",
    // Client portal
    "client.pending_approvals": "承認待ち",
    "client.design_changes": "設計変更",
    "client.progress_payments": "出来高払い",
    "client.reject_reason": "却下理由",
  },
  en: {
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.projects": "Projects",
    "nav.daily_reports": "Daily Reports",
    "nav.safety": "Safety",
    "nav.photos": "Photos",
    "nav.workers": "Workers",
    "nav.settings": "Settings",
    "nav.subcontractors": "Subcontractors",
    "nav.equipment": "Equipment",
    "nav.notifications": "Notifications",
    "nav.approval": "Approval Queue",
    "nav.health": "Health",
    "nav.today": "Today's Work",
    "nav.specs": "Spec Browser",
    "nav.search": "Search",
    "nav.admin": "Admin",
    // Actions
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.delete": "Delete",
    "action.submit": "Submit",
    "action.approve": "Approve",
    "action.reject": "Reject",
    "action.edit": "Edit",
    "action.add": "Add",
    "action.create": "Create",
    "action.upload": "Upload",
    "action.download": "Download",
    "action.generate": "Generate",
    "action.close": "Close",
    "action.confirm": "Confirm",
    "action.back": "Back",
    "action.next": "Next",
    "action.search": "Search",
    "action.filter": "Filter",
    "action.export": "Export",
    "action.import": "Import",
    "action.resolve": "Mark Resolved",
    "action.verify": "Verify",
    // Statuses
    "status.draft": "Draft",
    "status.submitted": "Submitted",
    "status.approved": "Approved",
    "status.rejected": "Rejected",
    "status.pending": "Pending",
    "status.active": "Active",
    "status.completed": "Completed",
    "status.cancelled": "Cancelled",
    "status.open": "Open",
    "status.in_progress": "In Progress",
    "status.resolved": "Resolved",
    "status.verified": "Verified",
    // Common labels
    "label.project": "Project",
    "label.date": "Date",
    "label.name": "Name",
    "label.title": "Title",
    "label.description": "Description",
    "label.status": "Status",
    "label.amount": "Amount",
    "label.notes": "Notes",
    "label.location": "Location",
    "label.assigned_to": "Assigned To",
    "label.due_date": "Due Date",
    "label.severity": "Severity",
    "label.type": "Type",
    "label.total": "Total",
    "label.loading": "Loading...",
    "label.error": "An error occurred",
    "label.no_data": "No data available",
    "label.required": "Required",
    "label.optional": "Optional",
    // Severity levels
    "severity.minor": "Minor",
    "severity.major": "Major",
    "severity.critical": "Critical",
    // Safety AI
    "safety.ai_score": "AI Safety Score",
    "safety.risk_forecast": "7-Day Risk Forecast",
    "safety.risk_low": "Low Risk",
    "safety.risk_medium": "Medium Risk",
    "safety.risk_high": "High Risk",
    "safety.risk_critical": "Critical Risk",
    // Punch list
    "punch.title": "Punch List",
    "punch.new_item": "Add Defect Item",
    "punch.location": "Location",
    "punch.reported_by": "Reported By",
    "punch.before_photo": "Before Photo",
    "punch.after_photo": "After Photo",
    // Client portal
    "client.pending_approvals": "Pending Approvals",
    "client.design_changes": "Design Changes",
    "client.progress_payments": "Progress Payments",
    "client.reject_reason": "Rejection Reason",
  },
  vi: {
    // Navigation
    "nav.dashboard": "Bảng điều khiển",
    "nav.projects": "Dự án",
    "nav.daily_reports": "Báo cáo hàng ngày",
    "nav.safety": "An toàn",
    "nav.photos": "Chụp ảnh",
    "nav.workers": "Công nhân",
    "nav.settings": "Cài đặt",
    "nav.subcontractors": "Nhà thầu phụ",
    "nav.equipment": "Thiết bị",
    "nav.notifications": "Thông báo",
    "nav.approval": "Hàng đợi phê duyệt",
    "nav.health": "Sức khỏe",
    "nav.today": "Công việc hôm nay",
    "nav.specs": "Tài liệu kỹ thuật",
    "nav.search": "Tìm kiếm",
    "nav.admin": "Quản trị",
    // Actions
    "action.save": "Lưu",
    "action.cancel": "Hủy",
    "action.delete": "Xóa",
    "action.submit": "Nộp",
    "action.approve": "Phê duyệt",
    "action.reject": "Từ chối",
    "action.edit": "Chỉnh sửa",
    "action.add": "Thêm",
    "action.create": "Tạo mới",
    "action.upload": "Tải lên",
    "action.download": "Tải xuống",
    "action.generate": "Tạo",
    "action.close": "Đóng",
    "action.confirm": "Xác nhận",
    "action.back": "Quay lại",
    "action.next": "Tiếp theo",
    "action.search": "Tìm kiếm",
    "action.filter": "Lọc",
    "action.export": "Xuất",
    "action.import": "Nhập",
    "action.resolve": "Đánh dấu đã giải quyết",
    "action.verify": "Xác minh",
    // Statuses
    "status.draft": "Bản nháp",
    "status.submitted": "Đã nộp",
    "status.approved": "Đã phê duyệt",
    "status.rejected": "Bị từ chối",
    "status.pending": "Đang chờ",
    "status.active": "Đang hoạt động",
    "status.completed": "Hoàn thành",
    "status.cancelled": "Đã hủy",
    "status.open": "Mở",
    "status.in_progress": "Đang xử lý",
    "status.resolved": "Đã giải quyết",
    "status.verified": "Đã xác minh",
    // Common labels
    "label.project": "Dự án",
    "label.date": "Ngày",
    "label.name": "Tên",
    "label.title": "Tiêu đề",
    "label.description": "Mô tả",
    "label.status": "Trạng thái",
    "label.amount": "Số tiền",
    "label.notes": "Ghi chú",
    "label.location": "Địa điểm",
    "label.assigned_to": "Người phụ trách",
    "label.due_date": "Hạn chót",
    "label.severity": "Mức độ nghiêm trọng",
    "label.type": "Loại",
    "label.total": "Tổng cộng",
    "label.loading": "Đang tải...",
    "label.error": "Đã xảy ra lỗi",
    "label.no_data": "Không có dữ liệu",
    "label.required": "Bắt buộc",
    "label.optional": "Tùy chọn",
    // Severity levels
    "severity.minor": "Nhẹ",
    "severity.major": "Nặng",
    "severity.critical": "Nghiêm trọng",
    // Safety AI
    "safety.ai_score": "Điểm an toàn AI",
    "safety.risk_forecast": "Dự báo rủi ro 7 ngày",
    "safety.risk_low": "Rủi ro thấp",
    "safety.risk_medium": "Rủi ro trung bình",
    "safety.risk_high": "Rủi ro cao",
    "safety.risk_critical": "Rủi ro nghiêm trọng",
    // Punch list
    "punch.title": "Danh sách lỗi",
    "punch.new_item": "Thêm lỗi",
    "punch.location": "Địa điểm",
    "punch.reported_by": "Người báo cáo",
    "punch.before_photo": "Ảnh trước",
    "punch.after_photo": "Ảnh sau",
    // Client portal
    "client.pending_approvals": "Chờ phê duyệt",
    "client.design_changes": "Thay đổi thiết kế",
    "client.progress_payments": "Thanh toán tiến độ",
    "client.reject_reason": "Lý do từ chối",
  },
  zh: {
    // Navigation
    "nav.dashboard": "仪表板",
    "nav.projects": "项目列表",
    "nav.daily_reports": "日报",
    "nav.safety": "安全管理",
    "nav.photos": "拍照",
    "nav.workers": "工人",
    "nav.settings": "设置",
    "nav.subcontractors": "分包商",
    "nav.equipment": "设备",
    "nav.notifications": "通知",
    "nav.approval": "审批队列",
    "nav.health": "健康状况",
    "nav.today": "今日工作",
    "nav.specs": "规范浏览器",
    "nav.search": "搜索",
    "nav.admin": "管理",
    // Actions
    "action.save": "保存",
    "action.cancel": "取消",
    "action.delete": "删除",
    "action.submit": "提交",
    "action.approve": "批准",
    "action.reject": "拒绝",
    "action.edit": "编辑",
    "action.add": "添加",
    "action.create": "创建",
    "action.upload": "上传",
    "action.download": "下载",
    "action.generate": "生成",
    "action.close": "关闭",
    "action.confirm": "确认",
    "action.back": "返回",
    "action.next": "下一步",
    "action.search": "搜索",
    "action.filter": "筛选",
    "action.export": "导出",
    "action.import": "导入",
    "action.resolve": "标记已解决",
    "action.verify": "验证",
    // Statuses
    "status.draft": "草稿",
    "status.submitted": "已提交",
    "status.approved": "已批准",
    "status.rejected": "已拒绝",
    "status.pending": "待处理",
    "status.active": "进行中",
    "status.completed": "已完成",
    "status.cancelled": "已取消",
    "status.open": "待处理",
    "status.in_progress": "处理中",
    "status.resolved": "已解决",
    "status.verified": "已验证",
    // Common labels
    "label.project": "项目",
    "label.date": "日期",
    "label.name": "姓名",
    "label.title": "标题",
    "label.description": "描述",
    "label.status": "状态",
    "label.amount": "金额",
    "label.notes": "备注",
    "label.location": "位置",
    "label.assigned_to": "负责人",
    "label.due_date": "截止日期",
    "label.severity": "严重程度",
    "label.type": "类型",
    "label.total": "合计",
    "label.loading": "加载中...",
    "label.error": "发生错误",
    "label.no_data": "暂无数据",
    "label.required": "必填",
    "label.optional": "选填",
    // Severity levels
    "severity.minor": "轻微",
    "severity.major": "重大",
    "severity.critical": "紧急",
    // Safety AI
    "safety.ai_score": "AI安全评分",
    "safety.risk_forecast": "7天风险预测",
    "safety.risk_low": "低风险",
    "safety.risk_medium": "中等风险",
    "safety.risk_high": "高风险",
    "safety.risk_critical": "紧急风险",
    // Punch list
    "punch.title": "问题清单",
    "punch.new_item": "添加问题",
    "punch.location": "位置",
    "punch.reported_by": "报告人",
    "punch.before_photo": "整改前照片",
    "punch.after_photo": "整改后照片",
    // Client portal
    "client.pending_approvals": "待审批",
    "client.design_changes": "设计变更",
    "client.progress_payments": "进度付款",
    "client.reject_reason": "拒绝原因",
  },
};

const STORAGE_KEY = "kouji_locale";

function getLocale(): Locale {
  if (typeof window === "undefined") return "ja";
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && stored in translations) return stored;
  // Browser language detection
  const lang = navigator.language.split("-")[0];
  if (lang === "zh") return "zh";
  if (lang === "vi") return "vi";
  if (lang === "en") return "en";
  return "ja";
}

function setLocale(locale: Locale): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, locale);
    // Trigger re-render via storage event
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: locale }));
  }
}

export function t(key: string, locale?: Locale): string {
  const l = locale ?? getLocale();
  const dict = translations[l] ?? translations.ja;
  return dict[key] ?? translations.ja[key] ?? key;
}

// React hooks — only import from components, not from server code
import { useState, useEffect } from "react";
import React from "react";

export function useLocale(): [Locale, (l: Locale) => void] {
  const [locale, setLocaleState] = useState<Locale>("ja");

  useEffect(() => {
    setLocaleState(getLocale());
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setLocaleState(e.newValue as Locale);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const updateLocale = (l: Locale) => {
    setLocale(l);
    setLocaleState(l);
  };

  return [locale, updateLocale];
}

export function T({ k }: { k: string }): React.ReactElement {
  const [locale] = useLocale();
  return React.createElement(React.Fragment, null, t(k, locale));
}
