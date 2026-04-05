"use client";

import { useOutdoorMode } from "@/lib/outdoor-mode";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface OutdoorModeToggleProps {
  /** Show full label or just icon */
  showLabel?: boolean;
  className?: string;
}

export function OutdoorModeToggle({
  showLabel = true,
  className,
}: OutdoorModeToggleProps) {
  const [outdoor, toggle] = useOutdoorMode();

  return (
    <button
      type="button"
      onClick={toggle}
      title={outdoor ? "標準モードに切り替え" : "屋外モードに切り替え"}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm font-medium",
        outdoor
          ? "bg-amber-500 text-white shadow-lg shadow-amber-300/40 hover:bg-amber-600"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200",
        className
      )}
    >
      {outdoor ? (
        <Sun className="w-4 h-4 flex-shrink-0" />
      ) : (
        <Moon className="w-4 h-4 flex-shrink-0" />
      )}
      {showLabel && (
        <span>{outdoor ? "屋外モード ON" : "屋外モード"}</span>
      )}
    </button>
  );
}
