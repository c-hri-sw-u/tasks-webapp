import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Header() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc = mounted && resolvedTheme === "light" ? "/logo-light.svg" : "/logo.svg";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* 自定义 Titlebar - 可拖动区域 */}
      <div
        className="h-8 w-full"
        style={{ WebkitAppRegion: "drag" }}
      />
      <div className="container flex h-14 items-center">
        <div className="flex items-center space-x-2">
          <Image
            src={logoSrc}
            width={24}
            height={24}
            alt="Logo"
            className="rounded-md shadow-[0_0_20px_2px_rgba(0,0,0,0.15)] dark:shadow-[0_0_20px_2px_rgba(255,255,255,0.)]"
          />
          <span className="font-bold">Task Manager</span>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2" style={{ WebkitAppRegion: "no-drag" }}>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}

export default Header;
