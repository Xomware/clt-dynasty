"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useId, useState } from "react";

import { InfoIcon, WarningIcon } from "@/components/xp/icons";
import { useAlerts } from "@/lib/alerts/alerts";
import { getProfile, linkSleeper, type PlatformUser, unlinkSleeper } from "@/lib/api/me";
import { useMember } from "@/lib/member/use-member";
import { getRosters, rosterOf } from "@/lib/sleeper/rosters";

import "./settings.css";

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; user: PlatformUser };
type RosterCheck = { status: "checking" } | { status: "failed" } | { status: "done"; rosterId: number | null };

export function SettingsWindow() {
  const { sync } = useMember();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    getProfile().then(
      (user) => live && setLoad({ status: "ready", user }),
      (e: Error) => live && setLoad({ status: "error", message: e.message }),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  // My Team and Profile read the link from /clt/me.
  const changed = (user: PlatformUser) => {
    setLoad({ status: "ready", user });
    sync();
  };

  return (
    <div className="flex flex-col gap-3">
      <MemberDetails />
      <section className="xp-group" aria-labelledby="settings-sleeper">
        <h2 id="settings-sleeper" className="xp-group-title">
          Sleeper account
        </h2>
        {load.status === "loading" && <p role="status">Loading your Sleeper link...</p>}
        {load.status === "error" && (
          <div className="flex flex-col items-start gap-2">
            <p role="alert">Couldn&rsquo;t load your Sleeper link: {load.message}</p>
            <button
              type="button"
              className="xp-button"
              onClick={() => {
                setLoad({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
            >
              Try again
            </button>
          </div>
        )}
        {load.status === "ready" &&
          (load.user.hasLinkedSleeper ? (
            <Linked user={load.user} onChange={(user) => changed(user)} />
          ) : (
            <LinkForm onLinked={(user) => changed(user)} />
          ))}
      </section>
    </div>
  );
}

function MemberDetails() {
  const { state } = useMember();
  if (state.status !== "member") return null;
  const { email, displayName } = state.me.member;
  return (
    <section className="xp-group" aria-labelledby="settings-member">
      <h2 id="settings-member" className="xp-group-title">
        League member
      </h2>
      <dl className="xp-summary">
        <dt>Name</dt>
        <dd>{displayName || "Not set"}</dd>
        <dt>Signed in as</dt>
        <dd className="min-w-0 break-all">{email}</dd>
      </dl>
    </section>
  );
}

interface LinkedProps {
  user: PlatformUser;
  onChange: (user: PlatformUser) => void;
}

function Linked({ user, onChange }: LinkedProps) {
  const { alert } = useAlerts();
  const [check, setCheck] = useState<RosterCheck>({ status: "checking" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getRosters().then(
      (rosters) => live && setCheck({ status: "done", rosterId: rosterOf(rosters, user.sleeperUserId) }),
      () => live && setCheck({ status: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [user.sleeperUserId]);

  const unlink = async () => {
    const answer = await alert({
      kind: "warning",
      title: "Unlink Sleeper",
      body: `Unlink ${user.sleeperUsername} from your account? Xomper uses the same link.`,
      buttons: ["Unlink", "Cancel"],
    });
    if (answer !== "Unlink") return;
    setBusy(true);
    setError(null);
    await unlinkSleeper().then(onChange, (e: Error) => setError(e.message));
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="settings-linked">
        <span className="xp-avatar settings-avatar" aria-hidden>
          {user.sleeperAvatar ? (
            <Image
              src={`https://sleepercdn.com/avatars/thumbs/${user.sleeperAvatar}`}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            user.sleeperUsername.charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{user.sleeperUsername}</p>
          <p className="text-xs">Sleeper ID {user.sleeperUserId}</p>
        </div>
        <button
          type="button"
          className="xp-button"
          disabled={busy}
          onClick={(e) => {
            // Safari never focuses a clicked button, and the dialog restores focus to its opener.
            e.currentTarget.focus();
            void unlink();
          }}
        >
          {busy ? "Unlinking..." : "Unlink"}
        </button>
      </div>
      {error && <p role="alert">Couldn&rsquo;t unlink: {error}</p>}
      <RosterNote check={check} />
    </div>
  );
}

function RosterNote({ check }: { check: RosterCheck }) {
  if (check.status === "checking") return <p role="status">Checking the league&rsquo;s rosters...</p>;
  if (check.status === "failed") {
    return (
      <p className="settings-note" role="status">
        <InfoIcon className="flex-none" />
        Couldn&rsquo;t reach Sleeper to check your team. Reopen Settings to try again.
      </p>
    );
  }
  if (check.rosterId === null) {
    return (
      <p className="settings-note settings-warning" role="alert">
        <WarningIcon className="flex-none" />
        This Sleeper account doesn&rsquo;t own a team in the CLT Dynasty League. Link the account you manage your team
        with.
      </p>
    );
  }
  return (
    <p className="settings-note" role="status">
      <InfoIcon className="flex-none" />
      Manages roster {check.rosterId} in the league.
    </p>
  );
}

function LinkForm({ onLinked }: { onLinked: (user: PlatformUser) => void }) {
  const inputId = useId();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const handle = username.trim();
    if (!handle) return;
    setBusy(true);
    setError(null);
    await linkSleeper(handle).then(onLinked, (err: Error) => setError(err.message));
    setBusy(false);
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => void submit(e)}>
      <p>Link your Sleeper account so the site knows which team is yours.</p>
      <label htmlFor={inputId} className="font-bold">
        Sleeper username
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={inputId}
          className="xp-input min-w-0 flex-1"
          value={username}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button type="submit" className="xp-button" disabled={busy || !username.trim()}>
          {busy ? "Linking..." : "Link"}
        </button>
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
