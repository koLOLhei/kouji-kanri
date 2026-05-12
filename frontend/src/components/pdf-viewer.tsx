"use client";

/**
 * Browser PDF viewer using pdf.js (npm package, bundled by Next.js).
 *
 * worker は new URL("...?url", import.meta.url) でバンドラ経由に解決し、
 * 本番デプロイ後も同じオリジンから配信される（CSP / CORS の問題が起きない）。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Loader2 } from "lucide-react";

type PdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
};

type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
};

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (
    src: string | { url: string; httpHeaders?: Record<string, string> },
  ) => { promise: Promise<PdfDocument> };
};

let _pdfjsPromise: Promise<PdfJsLib> | null = null;

async function loadPdfJs(): Promise<PdfJsLib> {
  if (_pdfjsPromise) return _pdfjsPromise;
  if (typeof window === "undefined") {
    throw new Error("PDF viewer requires browser");
  }
  _pdfjsPromise = (async () => {
    // Dynamic import: bundler は分割チャンク化するが、CDN ではなく同じオリジンから配信
    const mod = (await import("pdfjs-dist/build/pdf.min.mjs")) as PdfJsLib;
    // worker は public/ に postinstall で配置されているので固定URLで参照
    // (Next.js Turbopack の ?url suffix は実モジュールを返してしまうため不可)
    mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return mod;
  })();
  return _pdfjsPromise;
}

interface PdfViewerProps {
  url: string;
  filename?: string;
  initialScale?: number;
}

export function PdfViewer({ url, filename, initialScale = 1.2 }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PdfDocument | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(initialScale);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    loadPdfJs()
      .then((lib) => lib.getDocument(url).promise)
      .then((doc) => {
        if (cancelled) return;
        setPdfDoc(doc);
        setPageNum(1);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "PDF読み込みに失敗");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      setError(err instanceof Error ? err.message : "ページ描画に失敗");
    }
  }, [pdfDoc, pageNum, scale]);

  useEffect(() => {
    if (pdfDoc) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      renderPage();
    }
  }, [pdfDoc, renderPage]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-xl p-8 text-center gap-3">
        <p className="text-sm text-red-700">PDFビューアでの表示に失敗しました</p>
        <p className="text-xs text-gray-500">{error}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          <Download className="w-4 h-4" />
          ダウンロードして開く
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded-xl p-12 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className="text-sm text-gray-600">PDFを読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={pageNum <= 1}
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="前のページ"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-700 min-w-[80px] text-center">
            {pageNum} / {pdfDoc?.numPages ?? "?"}
          </span>
          <button
            onClick={() => setPageNum((p) => Math.min(pdfDoc?.numPages ?? 1, p + 1))}
            disabled={!pdfDoc || pageNum >= pdfDoc.numPages}
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="次のページ"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.4, s - 0.2))}
            className="p-2 rounded hover:bg-gray-200"
            aria-label="縮小"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 min-w-[44px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(4, s + 0.2))}
            className="p-2 rounded hover:bg-gray-200"
            aria-label="拡大"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <a
            href={url}
            download={filename}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded hover:bg-gray-200 ml-2"
            aria-label="ダウンロード"
            title="ダウンロード"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>
      <div className="overflow-auto max-h-[80vh] bg-gray-100 p-4 flex items-center justify-center">
        <canvas ref={canvasRef} className="shadow-lg bg-white" />
      </div>
    </div>
  );
}
