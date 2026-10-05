"use client";

import { Desktop } from "@/components/desktop/Desktop";
import { XpCursor } from "@/components/desktop/XpCursor";
import { PhoneShell } from "@/components/phone/PhoneShell";
import { SignInGreeting } from "@/components/xp/SignInGreeting";
import { Taskbar } from "@/components/xp/Taskbar";
import { DesktopProvider } from "@/lib/desktop/desktop-context";
import { PHONE, useMediaQuery } from "@/lib/use-media-query";

export function AppShell() {
  const phone = useMediaQuery(PHONE);
  return (
    <>
      {phone ? (
        <PhoneShell />
      ) : (
        <DesktopProvider>
          <Desktop />
          <Taskbar />
          <XpCursor />
        </DesktopProvider>
      )}
      <SignInGreeting />
    </>
  );
}
