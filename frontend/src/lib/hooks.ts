"use client";

import { useEffect, useState } from "react";

/**
 * useDebouncedValue — 値の変更を delay ms 後に反映する。
 *
 * 用途: 検索ボックスで毎キーストロークではなく入力停止後に API を叩く。
 *
 * @param value 監視する値
 * @param delay 遅延ミリ秒 (デフォルト 300ms)
 * @returns delay 経過後の値
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
