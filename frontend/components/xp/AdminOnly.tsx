"use client";

import type { ReactNode } from "react";

import { useMember } from "@/lib/member/use-member";

// Admin windows stay off the launchers for everyone else, but a shared link or
// a saved layout can still open one, so the body checks too. The API 403s regardless.
export function AdminOnly({ children }: { children: ReactNode }) {
  const { state } = useMember();
  if (state.status === "loading") return <p role="status">Checking your access...</p>;
  if (state.status !== "member" || !state.me.isAdmin) return <p role="alert">Only league admins can use this window.</p>;
  return children;
}
