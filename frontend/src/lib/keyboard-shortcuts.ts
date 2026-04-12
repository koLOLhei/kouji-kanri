"use client";

/**
 * D25: Global keyboard shortcuts.
 *
 * Shortcuts:
 *   n         → trigger "new item" action (registered per-page via onNew callback)
 *   Escape    → close modal / dismiss
 *   /         → focus global search input
 *   ?         → show/hide shortcut help overlay
 *
 * Usage (in a page or layout component):
 *   useKeyboardShortcuts({
 *     onNew: () => setShowForm(true),
 *     onSearch: () => document.querySelector<HTMLInputElement>('[data-search]')?.focus(),
 *   });
 *
 * The hook is safe to call from any client component; it cleans up on unmount.
 */

import { useEffect, useCallback } from "react";

interface ShortcutOptions {
  /** Called when user presses "n" on a list page */
  onNew?: () => void;
  /** Called when user presses "/" (focus search). Defaults to finding [data-search] input. */
  onSearch?: () => void;
  /** Called when user presses Escape */
  onEscape?: () => void;
  /** Called when user presses "?" — toggle shortcut help */
  onHelp?: () => void;
  /** If true, the hook is disabled (e.g. when a modal is open) */
  disabled?: boolean;
}

const SHORTCUT_HELP = [
  { key: "n", description: "新規作成" },
  { key: "/", description: "検索にフォーカス" },
  { key: "?", description: "ショートカット一覧を表示" },
  { key: "Esc", description: "モーダルを閉じる" },
] as const;

export const SHORTCUT_DESCRIPTIONS = SHORTCUT_HELP;

export function useKeyboardShortcuts(options: ShortcutOptions = {}) {
  const { onNew, onSearch, onEscape, onHelp, disabled = false } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      // Ignore shortcuts when the user is typing in an input, textarea or contenteditable
      const target = e.target as HTMLElement;
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Escape works even when editing (closes modals)
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }

      if (isEditing) return;

      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        onNew?.();
        return;
      }

      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (onSearch) {
          onSearch();
        } else {
          // Default: find any [data-search] input
          const searchInput = document.querySelector<HTMLInputElement>("[data-search]");
          searchInput?.focus();
        }
        return;
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onHelp?.();
        return;
      }
    },
    [disabled, onNew, onSearch, onEscape, onHelp]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * ShortcutHelpModal — call from any page where you want the help overlay.
 * Renders nothing; data is exported via SHORTCUT_DESCRIPTIONS.
 */
export function getShortcutHelpRows(): { key: string; description: string }[] {
  return [...SHORTCUT_DESCRIPTIONS];
}
