"use client";

import { useEffect, useRef } from "react";

import { useAlerts } from "@/lib/alerts/alerts";
import { useMember } from "@/lib/member/use-member";
import { playWhenAllowed } from "@/lib/sound/sound";

// Runs once per signed-in load: the startup chime and a welcome balloon.
export function SignInGreeting() {
  const { notify } = useAlerts();
  const { state } = useMember();
  const member = state.status === "member" ? state.me.member : null;
  const greeted = useRef(false);

  useEffect(() => {
    playWhenAllowed("startup");
  }, []);

  useEffect(() => {
    if (!member || greeted.current) return;
    greeted.current = true;
    notify({
      title: member.displayName ? `Welcome back, ${member.displayName}` : "Welcome to CLT Dynasty",
      body: "The new league site is coming together. Windows land on this desktop one at a time.",
      icon: "info",
    });
  }, [member, notify]);

  return null;
}
