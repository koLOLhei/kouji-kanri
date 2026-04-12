"use client";

/**
 * D23: Reusable sortable + filterable data table.
 * Usage:
 *   <DataTable
 *     data={workers}
 *     columns={[
 *       { key: "name", label: "名前", sortable: true },
 *       { key: "company_name", label: "会社名" },
 *     ]}
 *     filterPlaceholder="作業員を検索..."
 *     filterKeys={["name", "company_name"]}
 *   />
 */

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  className?: string;
}

type SortDir = "asc" | "desc" | null;

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  filterPlaceholder?: string;
  /** Keys to search across when filtering */
  filterKeys?: (keyof T)[];
  rowKey: keyof T;
  className?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  filterPlaceholder = "検索...",
  filterKeys,
  rowKey,
  className,
  emptyMessage = "データがありません",
  onRowClick,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
      else setSortDir("asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return data;
    const keys = filterKeys ?? (columns.map((c) => c.key) as (keyof T)[]);
    return data.filter((row) =>
      keys.some((k) => {
        const val = row[k];
        if (val == null) return false;
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, query, filterKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: Column<T> }) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />;
    if (sortDir === "asc") return <ChevronUp className="w-3.5 h-3.5 text-blue-500" />;
    return <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Filter input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={filterPlaceholder}
          aria-label={filterPlaceholder}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            aria-label="クリア"
          >
            ✕
          </button>
        )}
      </div>

      {/* Result count */}
      {query && (
        <p className="text-xs text-gray-500">
          {sorted.length} 件 / {data.length} 件
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap select-none",
                    col.sortable && "cursor-pointer hover:bg-gray-100 transition-colors",
                    col.className
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-gray-400 text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={String(row[rowKey])}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "bg-white transition-colors",
                    onRowClick && "cursor-pointer hover:bg-blue-50"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn("px-4 py-3 text-gray-700", col.className)}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key] != null
                        ? String(row[col.key])
                        : <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
