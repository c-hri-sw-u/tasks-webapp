"use client";

import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { CheckSquare } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
          <CheckSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Task Manager
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize your day, achieve your goals
          </p>
        </div>
      </div>
      <ThemeSwitcher />
    </header>
  );
}

export default Header;
