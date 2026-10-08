"use client";

import { useEffect, useRef } from "react";

import { useAlerts } from "@/lib/alerts/alerts";
import { useMember } from "@/lib/member/use-member";
import { playWhenAllowed } from "@/lib/sound/sound";
import { useTheme } from "@/lib/theme/theme";

// Runs once per signed-in load: the startup chime and a welcome balloon.
export function SignInGreeting() {
  const { notify } = useAlerts();
  const { state } = useMember();
  const member = state.status === "member" ? state.me.member : null;
  const greeted = useRef(false);
  const buzz = useTheme().theme === "buzz";

  useEffect(() => {
    playWhenAllowed("startup");
  }, []);

  useEffect(() => {
    if (!member || greeted.current) return;
    greeted.current = true;
    notify({
      title: member.displayName ? `Welcome back, ${member.displayName}` : "Welcome to CLT Dynasty",
      body: buzz
        ? "Every page is a tap away in the nav, and search finds any team or player."
        : "Everything in the league is a double-click away: open a folder or the Start menu.",
      icon: "info",
    });
  }, [member, notify, buzz]);

  return null;
}
