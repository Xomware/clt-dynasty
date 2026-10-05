"use client";

import { Desktop } from "@/components/desktop/Desktop";
import { XpCursor } from "@/components/desktop/XpCursor";
import { SignInGreeting } from "@/components/xp/SignInGreeting";
import { Taskbar } from "@/components/xp/Taskbar";
import { DesktopProvider } from "@/lib/desktop/desktop-context";

export function AppShell() {
  return (
    <DesktopProvider>
      <Desktop />
      <Taskbar />
      <XpCursor />
      <SignInGreeting />
    </DesktopProvider>
  );
}
