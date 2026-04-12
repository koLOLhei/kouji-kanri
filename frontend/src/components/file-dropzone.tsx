"use client";

/**
 * D24: Drag-and-drop file upload zone.
 * Usage:
 *   <FileDropzone
 *     accept="image/*"
 *     multiple
 *     onDrop={(files) => handleFiles(files)}
 *   />
 */

import { useRef, useState, useCallback, DragEvent, ChangeEvent } from "react";
import { UploadCloud, X, FileImage, FileText, File } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DroppedFile {
  file: File;
  previewUrl: string | null;
}

interface FileDropzoneProps {
  onDrop: (files: DroppedFile[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  className?: string;
  disabled?: boolean;
  label?: string;
}

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) return <FileImage className="w-4 h-4 text-blue-500" />;
  if (file.type === "application/pdf") return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-gray-500" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  onDrop,
  accept = "image/*,application/pdf",
  multiple = true,
  maxSizeMB = 20,
  className,
  disabled = false,
  label = "ファイルをドラッグ＆ドロップ、またはクリックして選択",
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const processFiles = useCallback(
    (rawFiles: FileList | File[]) => {
      const list = Array.from(rawFiles);
      const maxBytes = maxSizeMB * 1024 * 1024;
      const oversized = list.filter((f) => f.size > maxBytes);
      if (oversized.length > 0) {
        setError(
          `ファイルサイズの上限は ${maxSizeMB}MB です。大きすぎるファイル: ${oversized.map((f) => f.name).join(", ")}`
        );
        return;
      }
      setError(null);

      const droppedFiles: DroppedFile[] = list.map((file) => ({
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      }));

      setFiles((prev) => {
        const merged = multiple ? [...prev, ...droppedFiles] : droppedFiles;
        onDrop(merged);
        return merged;
      });
    },
    [maxSizeMB, multiple, onDrop]
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const next = [...prev];
      if (next[index].previewUrl) {
        URL.revokeObjectURL(next[index].previewUrl!);
      }
      next.splice(index, 1);
      onDrop(next);
      return next;
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 select-none",
          isDragOver
            ? "border-blue-500 bg-blue-50 scale-[1.01]"
            : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/30",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <UploadCloud
          className={cn(
            "w-10 h-10 transition-colors",
            isDragOver ? "text-blue-500" : "text-gray-400"
          )}
        />
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-400 mt-1">
            最大 {maxSizeMB}MB　　対応形式: {accept}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="sr-only"
          aria-hidden="true"
        />
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* File preview list */}
      {files.length > 0 && (
        <ul className="space-y-2" aria-label="選択済みファイル">
          {files.map((df, idx) => (
            <li
              key={idx}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm"
            >
              {/* Image preview */}
              {df.previewUrl ? (
                <img
                  src={df.previewUrl}
                  alt={df.file.name}
                  className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg flex-shrink-0">
                  {getFileIcon(df.file)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{df.file.name}</p>
                <p className="text-xs text-gray-400">{formatSize(df.file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                aria-label={`${df.file.name} を削除`}
                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
