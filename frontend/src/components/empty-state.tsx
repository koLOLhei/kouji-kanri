import { ReactNode } from "react";
import Link from "next/link";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 flex flex-col items-center text-center gap-4">
      <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
        {icon}
      </div>
      <div className="max-w-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
      {actionLabel && (
        <>
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200 mt-2"
            >
              {actionLabel}
            </Link>
          ) : onAction ? (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200 mt-2"
            >
              {actionLabel}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
