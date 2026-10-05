"use client";

import { Hub } from "aws-amplify/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandLoader } from "@/components/xp/BrandLoader";
import { takeNextPath } from "@/lib/auth/next-path";
import { useAuth } from "@/lib/auth/use-auth";
import { LogonLoading, LogonScreen } from "./LogonScreen";

/**
 * Waits for Amplify to finish the Google sign-in, then leaves.
 *
 * Amplify detects `?code=` on load and exchanges it itself, so nothing here
 * parses the URL. A hosted-UI round trip can fail without the browser ever
 * reporting it (revoked consent, clock skew, a code already redeemed), so
 * after a timeout this says so instead of spinning forever.
 */
const TIMEOUT_MS = 8000;

export function AuthCallback() {
  const router = useRouter();
  const { status, refresh } = useAuth();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const stop = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signInWithRedirect") void refresh();
      if (payload.event === "signInWithRedirect_failure") setFailed(true);
    });
    const timer = setTimeout(() => setFailed(true), TIMEOUT_MS);
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, [refresh]);

  useEffect(() => {
    if (status !== "signedIn") return;
    // replace(), not push(): the callback URL holds a spent authorization
    // code, and Back would land on a request that can never succeed again.
    router.replace(takeNextPath());
  }, [status, router]);

  if (failed && status !== "signedIn") {
    return (
      <LogonScreen>
        <h1>That sign-in did not finish</h1>
        <p role="alert">The link may have expired, or the window was left open too long. Try again.</p>
        <p>
          <Link href="/" className="xp-logon-link">
            Back to sign in
          </Link>
        </p>
      </LogonScreen>
    );
  }
  return (
    <LogonLoading>
      <BrandLoader label="Signing you in..." />
    </LogonLoading>
  );
}
