"use client";

import { type FormEvent, useContext, useId, useState } from "react";

import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import type { WindowParams } from "@/lib/desktop/windows";
import { account, league as getLeague } from "@/lib/league/cache";
import { SleeperError } from "@/lib/sleeper/client";
import { leagueLink, profileLink } from "@/lib/team/links";
import { ViewParamsContext } from "@/lib/view-params";

import "./search.css";
// .xp-input and the disabled button live with Settings, the first form.
import "./settings.css";

type Mode = "user" | "league";

const MODES: Record<Mode, { label: string; field: string; hint: string }> = {
  user: { label: "Sleeper user", field: "Sleeper username or user ID", hint: "Opens the manager's profile and their leagues." },
  league: { label: "Sleeper league", field: "Sleeper league ID", hint: "The long number in a league's Sleeper link, sleeper.com/leagues/<ID>." },
};

// Resolves the search to the window it opens, or says why it can't.
async function find(mode: Mode, term: string) {
  if (mode === "user") {
    const found = await account(term);
    return found ? profileLink(found.user_id) : `No Sleeper user named ${term}.`;
  }
  if (!/^\d+$/.test(term)) return "A league ID is all digits.";
  const league = await getLeague(term).catch((e: Error) => {
    if (e instanceof SleeperError && e.status === 404) return null;
    throw e;
  });
  return league ? leagueLink(league.league_id) : `No Sleeper league with ID ${term}.`;
}

type Status = { status: "idle" } | { status: "searching" } | { status: "miss"; message: string } | { status: "error"; message: string };

export function SearchWindow({ params }: { params: WindowParams }) {
  const id = useId();
  const navigate = useContext(NavigateContext);
  const open = useContext(DrillContext);
  const setParams = useContext(ViewParamsContext);
  const [mode, setMode] = useState<Mode>(params.mode === "league" ? "league" : "user");
  const [term, setTerm] = useState(String(params.q ?? ""));
  const [status, setStatus] = useState<Status>({ status: "idle" });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    setStatus({ status: "searching" });
    try {
      const hit = await find(mode, q);
      if (typeof hit === "string") return setStatus({ status: "miss", message: hit });
      // Kept in the view's params, so Back returns to this search filled in.
      setParams?.({ mode, q });
      setStatus({ status: "idle" });
      (navigate ?? open)(hit);
    } catch (err) {
      setStatus({ status: "error", message: (err as Error).message });
    }
  };

  const busy = status.status === "searching";
  const problem = status.status === "miss" || status.status === "error" ? status : null;

  return (
    <form className="search" onSubmit={(e) => void submit(e)}>
      <fieldset className="search-modes">
        <legend className="xp-group-title">Search for</legend>
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <label key={m} className="search-mode">
            <input
              type="radio"
              name={`${id}-mode`}
              value={m}
              checked={mode === m}
              onChange={() => {
                setMode(m);
                setStatus({ status: "idle" });
              }}
            />
            {MODES[m].label}
          </label>
        ))}
      </fieldset>
      <label htmlFor={`${id}-term`} className="font-bold">
        {MODES[mode].field}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={`${id}-term`}
          className="xp-input min-w-0 flex-1"
          value={term}
          inputMode={mode === "league" ? "numeric" : undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={problem ? true : undefined}
          aria-describedby={`${id}-hint`}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button type="submit" className="xp-button" disabled={busy || !term.trim()}>
          {busy ? "Searching..." : "Search"}
        </button>
      </div>
      <p id={`${id}-hint`} className="text-xs">
        {MODES[mode].hint}
      </p>
      <div aria-live="polite">
        {busy && <p role="status">Asking Sleeper...</p>}
        {problem && (
          <p className="search-miss" role="alert">
            {problem.status === "error" ? `Couldn’t reach Sleeper: ${problem.message}` : problem.message}
          </p>
        )}
      </div>
    </form>
  );
}
