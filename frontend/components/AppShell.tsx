"use client";

import { BuzzPhone } from "@/components/buzz/BuzzPhone";
import { BuzzShell } from "@/components/buzz/BuzzShell";
import { Desktop } from "@/components/desktop/Desktop";
import { XpCursor } from "@/components/desktop/XpCursor";
import { PhoneShell } from "@/components/phone/PhoneShell";
import { SignInGreeting } from "@/components/xp/SignInGreeting";
import { Taskbar } from "@/components/xp/Taskbar";
import { DesktopProvider } from "@/lib/desktop/desktop-context";
import { useTheme } from "@/lib/theme/theme";
import { PHONE, useMediaQuery } from "@/lib/use-media-query";

export function AppShell() {
  const phone = useMediaQuery(PHONE);
  const buzz = useTheme().theme === "buzz";
  return (
    <>
      {phone ? (
        buzz ? (
          <BuzzPhone />
        ) : (
          <PhoneShell />
        )
      ) : buzz ? (
        <BuzzShell />
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
