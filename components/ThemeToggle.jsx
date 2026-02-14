"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ theme, setTheme }) {
  // 컴포넌트가 브라우저에 로드되었는지 확인하는 상태
  const [mounted, setMounted] = useState(false);

  // 브라우저에 마운트된 직후에 true로 변경
  useEffect(() => {
    setMounted(true);
  }, []);

  // 마운트되기 전(서버 사이드 렌더링 시점)에는 아이콘을 그리지 않거나 
  // 레이아웃이 깨지지 않게 빈 공간(또는 기본 상태)만 유지합니다.
  if (!mounted) {
    return (
      <button
        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        aria-label="Loading theme"
      >
        <div className="h-4 w-4" /> {/* 아이콘 자리를 비워둠 */}
        <span className="hidden sm:inline">Loading...</span>
      </button>
    );
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-sm hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {theme === "dark" ? "Light" : "Dark"}
      </span>
    </button>
  );
}