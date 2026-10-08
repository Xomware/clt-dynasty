"use client";

import { type FormEvent, type KeyboardEvent, useContext, useId, useState } from "react";

import { NflTeamHit, PlayerHit } from "@/components/xp/NflHit";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import type { WindowParams } from "@/lib/desktop/windows";
import { account, league as getLeague } from "@/lib/league/cache";
import { nflTeamName } from "@/lib/nfl/teams";
import { nflLink, playerLink } from "@/lib/player/links";
import { useNflSearch } from "@/lib/search/use-nfl-search";
import { SleeperError } from "@/lib/sleeper/client";
import { leagueLink, profileLink } from "@/lib/team/links";
import { ViewParamsContext } from "@/lib/view-params";

import "./search.css";
// .xp-input and the disabled button live with Settings, the first form.
import "./settings.css";

type Mode = "nfl" | "user" | "league";

const MODES: Record<Mode, { label: string; field: string; hint: string }> = {
  nfl: { label: "NFL player or team", field: "Player or NFL team", hint: "A name, a city, or a code like LAC. Results show as you type." },
  user: { label: "Sleeper user", field: "Sleeper username or user ID", hint: "Opens the manager's profile and their leagues." },
  league: { label: "Sleeper league", field: "Sleeper league ID", hint: "The long number in a league's Sleeper link, sleeper.com/leagues/<ID>." },
};

// Resolves the search to the window it opens, or says why it can't.
async function find(mode: Exclude<Mode, "nfl">, term: string) {
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
  const [mode, setMode] = useState<Mode>(params.mode === "league" || params.mode === "user" ? params.mode : "nfl");
  const [term, setTerm] = useState(String(params.q ?? ""));
  const [status, setStatus] = useState<Status>({ status: "idle" });

  const go = (to: WindowLink) => {
    // Kept in the view's params, so Back returns to this search filled in.
    setParams?.({ mode, q: term.trim() });
    (navigate ?? open)(to);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (!q || mode === "nfl") return;
    setStatus({ status: "searching" });
    try {
      const hit = await find(mode, q);
      if (typeof hit === "string") return setStatus({ status: "miss", message: hit });
      setStatus({ status: "idle" });
      go(hit);
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
      {mode === "nfl" ? (
        <NflSearch term={term} onTerm={setTerm} onGo={go} />
      ) : (
        <>
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
        </>
      )}
    </form>
  );
}

interface NflSearchProps {
  term: string;
  onTerm: (term: string) => void;
  onGo: (to: WindowLink) => void;
}

// Live results under the field, walked with the arrows the combobox way: focus
// stays in the field and Enter opens the highlighted row.
function NflSearch({ term, onTerm, onGo }: NflSearchProps) {
  const id = useId();
  const [at, setAt] = useState(0);
  const { players, teams, status } = useNflSearch(term, 20);
  const options = [
    ...teams.slice(0, 4).map((h) => ({ key: `nfl-${h.item.abbr}`, label: nflTeamName(h.item), to: nflLink(h.item.abbr), body: <NflTeamHit team={h.item} /> })),
    ...players.map((h) => ({
      key: `player-${h.item.player_id}`,
      label: h.description,
      to: playerLink(h.item.player_id),
      body: <PlayerHit player={h.item} owner={h.owner} />,
    })),
  ];
  const index = Math.min(at, options.length - 1);
  const optionId = (i: number) => `${id}-option-${i}`;
  const q = term.trim();

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (options[index]) onGo(options[index].to);
      return;
    }
    if ((e.key !== "ArrowDown" && e.key !== "ArrowUp") || options.length === 0) return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    setAt(next);
    document.getElementById(optionId(next))?.scrollIntoView?.({ block: "nearest" });
  };

  return (
    <>
      <label htmlFor={`${id}-term`} className="font-bold">
        {MODES.nfl.field}
      </label>
      <input
        id={`${id}-term`}
        type="text"
        role="combobox"
        className="xp-input"
        value={term}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="go"
        aria-expanded={options.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={options[index] ? optionId(index) : undefined}
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          onTerm(e.target.value);
          setAt(0);
        }}
        onKeyDown={onKeyDown}
      />
      <p id={`${id}-hint`} className="text-xs">
        {MODES.nfl.hint}
      </p>
      <div id={`${id}-list`} role="listbox" aria-label="NFL players and teams" className="search-results">
        {options.map((o, i) => (
          <div
            key={o.key}
            id={optionId(i)}
            role="option"
            aria-selected={i === index}
            aria-label={o.label}
            className="search-result"
            onMouseDown={(e) => e.preventDefault()}
            onMouseMove={() => i !== index && setAt(i)}
            onClick={() => onGo(o.to)}
          >
            {o.body}
          </div>
        ))}
      </div>
      <div aria-live="polite">
        {status === "loading" && q && <p role="status">Loading NFL players...</p>}
        {status === "error" && (
          <p className="search-miss" role="alert">
            Couldn&rsquo;t load NFL players. Teams still search.
          </p>
        )}
        {status === "ok" && q && options.length === 0 && <p className="search-miss">No player or NFL team matches &ldquo;{q}&rdquo;.</p>}
      </div>
    </>
  );
}
