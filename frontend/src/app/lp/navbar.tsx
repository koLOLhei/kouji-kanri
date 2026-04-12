"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const { token } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/lp" className="flex items-center">
          <Image src="/logo.png" alt="KAMO construction" width={280} height={280} className="h-16 w-auto" priority />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#reasons" className="text-sm text-[#1a1a1a] hover:text-gray-500 transition-colors tracking-wide">
            選ばれる理由
          </a>
          <a href="#persona" className="text-sm text-[#1a1a1a] hover:text-gray-500 transition-colors tracking-wide">
            お客様別のご案内
          </a>
          <a href="#voices" className="text-sm text-[#1a1a1a] hover:text-gray-500 transition-colors tracking-wide">
            お客様の声
          </a>
          <a
            href="https://kamo.soara-mu.jp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#1a1a1a] hover:text-gray-500 transition-colors tracking-wide"
          >
            コーポレートサイト
          </a>
        </div>

        <div className="flex items-center gap-3">
          {token ? (
            <Link
              href="/"
              className="bg-[#1a1a1a] hover:bg-[#333] text-white px-6 py-2.5 text-sm tracking-wider transition-colors"
            >
              ダッシュボードへ
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-[#1a1a1a] hover:text-gray-500 transition-colors px-3 py-2 tracking-wide"
              >
                ログイン
              </Link>
              <a
                href="https://kamo.soara-mu.jp/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#1a1a1a] hover:bg-[#333] text-white px-6 py-2.5 text-sm tracking-wider transition-colors"
              >
                お問い合わせ
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
