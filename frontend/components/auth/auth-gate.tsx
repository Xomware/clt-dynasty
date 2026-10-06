"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Landing } from "@/components/landing/Landing";
import { BrandLoader } from "@/components/xp/BrandLoader";
import { AlertsProvider } from "@/lib/alerts/alerts";
import { authConfigured, CALLBACK_PATH } from "@/lib/auth/amplify";
import { useAuth } from "@/lib/auth/use-auth";
import { MemberProvider, useMember } from "@/lib/member/use-member";
import { LogonLoading, LogonScreen } from "./LogonScreen";

interface GateProps {
  children: ReactNode;
}

function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <button type="button" className="xp-log-off" onClick={onSignOut}>
      Sign out
    </button>
  );
}

// Only roster members get past /clt/me; everyone else sees why.
function MemberGate({ children, onSignOut }: GateProps & { onSignOut: () => void }) {
  const { state, refresh } = useMember();
  const { email } = useAuth();

  if (state.status === "member") return children;
  if (state.status === "loading") {
    return (
      <LogonLoading>
        <BrandLoader label="Checking the roster..." />
      </LogonLoading>
    );
  }
  if (state.status === "not-member") {
    return (
      <LogonScreen footer={<SignOutButton onSignOut={onSignOut} />}>
        <h1>You&rsquo;re not on the roster</h1>
        <p>
          {email ? <strong>{email}</strong> : "This Google account"} isn&rsquo;t on the CLT Dynasty League roster. If
          you&rsquo;re in the league, ask the commissioner to add the address you sign in with, or sign out and try
          another account.
        </p>
      </LogonScreen>
    );
  }
  return (
    <LogonScreen footer={<SignOutButton onSignOut={onSignOut} />}>
      <h1>Couldn&rsquo;t reach the league</h1>
      <p role="alert">{state.message}</p>
      <div>
        <button type="button" className="xp-button" onClick={refresh}>
          Try again
        </button>
      </div>
    </LogonScreen>
  );
}

/**
 * THIS IS UX, NOT SECURITY. The site is a static export: anyone can read the
 * bundle. The gate shows signed-out visitors the sign-in screen instead of
 * empty pages; member data is only ever served by /clt/* behind Xomper's
 * authorizer and the CLT member gate.
 */
export function AuthGate({ children }: GateProps) {
  const pathname = usePathname();
  const { status, signInWithGoogle, signOut } = useAuth();

  // The callback must render signed out: it is where the sign-in completes.
  if (pathname.replace(/\/$/, "") === CALLBACK_PATH) return children;
  if (status === "loading") {
    return (
      <LogonLoading>
        <BrandLoader label="Loading..." />
      </LogonLoading>
    );
  }
  if (status !== "signedIn") return <Landing onSignIn={authConfigured ? () => void signInWithGoogle() : undefined} />;
  return (
    <MemberProvider>
      <AlertsProvider>
        <MemberGate onSignOut={() => void signOut()}>{children}</MemberGate>
      </AlertsProvider>
    </MemberProvider>
  );
}
