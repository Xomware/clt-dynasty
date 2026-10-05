import type { ReactNode } from "react";

import { CrownIcon } from "@/components/xp/icons";

import "./logon.css";

interface LogonScreenProps {
  children: ReactNode;
  footer?: ReactNode;
}

// XP's Welcome screen: the league mark on the left, what to do next on the
// right, split by the white rule. Sign-in, the callback's failure and the
// roster check all sit on it.
export function LogonScreen({ children, footer }: LogonScreenProps) {
  return (
    <main className="xp-logon">
      <div className="xp-logon-band" />
      <div className="xp-logon-body">
        <div className="xp-logon-brand">
          <CrownIcon width={72} height={72} />
          <p className="xp-logon-name">CLT Dynasty</p>
          <p className="xp-logon-tagline">The Queen City&rsquo;s dynasty league</p>
        </div>
        <div className="xp-logon-panel">{children}</div>
      </div>
      <div className="xp-logon-band xp-logon-foot">{footer}</div>
    </main>
  );
}

// Brand loader on the same blue, for the moments in between.
export function LogonLoading({ children }: { children: ReactNode }) {
  return <main className="brand-loader-page flex min-h-dvh items-center justify-center p-8">{children}</main>;
}
