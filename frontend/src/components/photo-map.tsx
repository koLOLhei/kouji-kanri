"use client";

import { useState } from "react";
import { MapPin, X, ExternalLink, AlertCircle, Image as ImageIcon } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PhotoWithGPS {
  id: string;
  thumbnail_url: string | null;
  url: string | null;
  caption: string | null;
  original_filename: string | null;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  work_type?: string | null;
  photo_category?: string | null;
}

interface PhotoMapProps {
  photos: PhotoWithGPS[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLatLon(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lon).toFixed(5)}° ${lonDir}`;
}

/**
 * Returns a static map image URL using OpenStreetMap tiles via the staticmap
 * service (no API key required).
 */
function staticMapUrl(lat: number, lon: number, zoom = 16): string {
  // Using openstreetmap.org export as a simple approach
  // Returns an embed-friendly tile URL centered on the coordinate
  const size = 640;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=${zoom}&size=${size}x${size / 2}&markers=${lat},${lon},red`;
}

/**
 * Returns an OSM link for the coordinate.
 */
function osmLink(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=17`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PhotoMap({ photos }: PhotoMapProps) {
  const photosWithGPS = photos.filter(
    (p) => p.latitude != null && p.longitude != null
  );
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithGPS | null>(null);

  if (photosWithGPS.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-600 mb-1">
          GPS情報がありません
        </p>
        <p className="text-xs text-gray-400">
          GPS情報を持つ写真がありません。スマートフォンで撮影するとGPS座標が自動的に記録されます。
        </p>
      </div>
    );
  }

  // Compute center of all GPS points
  const avgLat =
    photosWithGPS.reduce((s, p) => s + p.latitude!, 0) / photosWithGPS.length;
  const avgLon =
    photosWithGPS.reduce((s, p) => s + p.longitude!, 0) / photosWithGPS.length;

  return (
    <div className="space-y-4">
      {/* ── Static map image ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            撮影位置マップ
            <span className="text-xs font-normal text-gray-500">
              ({photosWithGPS.length}枚のGPS情報あり)
            </span>
          </h3>
          <a
            href={osmLink(avgLat, avgLon)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            OpenStreetMapで開く
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Map tile via img tag */}
        <div className="relative bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={staticMapUrl(avgLat, avgLon)}
            alt="撮影位置マップ"
            className="w-full object-cover"
            style={{ minHeight: 200, maxHeight: 360 }}
            onError={(e) => {
              // Fallback to OSM tile iframe if static map fails
              const parent = (e.target as HTMLImageElement).parentElement;
              if (!parent) return;
              const iframe = document.createElement("iframe");
              iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${
                avgLon - 0.005
              },${avgLat - 0.003},${avgLon + 0.005},${avgLat + 0.003}&layer=mapnik&marker=${avgLat},${avgLon}`;
              iframe.style.width = "100%";
              iframe.style.height = "320px";
              iframe.style.border = "none";
              iframe.title = "OpenStreetMap";
              (e.target as HTMLImageElement).replaceWith(iframe);
            }}
          />

          {/* Photo count badge */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-800 shadow">
            <MapPin className="w-3 h-3 inline mr-1 text-red-500" />
            {photosWithGPS.length}箇所
          </div>
        </div>
      </div>

      {/* ── Photo cards with GPS ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {photosWithGPS.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="group relative bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md hover:border-blue-200 transition-all"
          >
            {photo.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.thumbnail_url}
                alt={photo.caption || ""}
                className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-28 bg-gray-100 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-300" />
              </div>
            )}
            <div className="p-2">
              <p className="text-xs text-gray-600 truncate">
                {photo.caption || photo.original_filename || "写真"}
              </p>
              <p className="text-[10px] text-blue-600 mt-0.5 flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" />
                {formatLatLon(photo.latitude!, photo.longitude!)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Detail modal ── */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">写真詳細</h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Photo */}
            {selectedPhoto.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || ""}
                className="w-full object-cover"
                style={{ maxHeight: 280 }}
              />
            ) : (
              <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-gray-300" />
              </div>
            )}

            {/* Details */}
            <div className="p-4 space-y-2">
              {selectedPhoto.caption && (
                <p className="text-sm font-medium text-gray-800">
                  {selectedPhoto.caption}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                {formatLatLon(selectedPhoto.latitude!, selectedPhoto.longitude!)}
              </div>
              {selectedPhoto.work_type && (
                <p className="text-xs text-gray-500">工種: {selectedPhoto.work_type}</p>
              )}
              {selectedPhoto.photo_category && (
                <p className="text-xs text-gray-500">
                  写真区分: {selectedPhoto.photo_category}
                </p>
              )}
              <p className="text-xs text-gray-400">
                {new Date(selectedPhoto.created_at).toLocaleString("ja-JP")}
              </p>

              <a
                href={osmLink(selectedPhoto.latitude!, selectedPhoto.longitude!)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                OpenStreetMapで位置を確認
              </a>

              {selectedPhoto.url && (
                <a
                  href={selectedPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-center py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  フルサイズで開く
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
