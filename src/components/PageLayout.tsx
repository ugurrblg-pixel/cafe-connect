import { useActiveCheckIn } from "@/hooks/useActiveCheckIn";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component that adds top padding when check-in status bar is visible
 */
export function PageLayout({ children, className }: PageLayoutProps) {
  const { activeCheckIn } = useActiveCheckIn();
  const location = useLocation();

  // Status bar is hidden on these routes
  const hideStatusBar =
    location.pathname.startsWith("/cafe/") ||
    location.pathname.startsWith("/chat/") ||
    location.pathname === "/auth";

  const hasStatusBar = activeCheckIn && !hideStatusBar;

  return (
    <div
      style={
        { "--page-top-offset": hasStatusBar ? "3rem" : "0px" } as CSSProperties
      }
      className={cn(
        "mx-auto min-h-screen max-w-[440px] bg-background",
        hasStatusBar && "pt-12",
        className,
      )}
    >
      {children}
    </div>
  );
}
