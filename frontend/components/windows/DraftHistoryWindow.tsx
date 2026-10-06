"use client";

import { useEffect, useId, useState } from "react";

import { Tabs } from "@/components/xp/Tabs";
import { StarIcon } from "@/components/xp/icons";
import type { WindowParams } from "@/lib/desktop/windows";
import { draftPicks, drafts, rosters, tradedPicks, users } from "@/lib/league/cache";
import { type Cell, draftBoard, latestDraft, pickedName } from "@/lib/league/drafts";
import { leagueChain } from "@/lib/league/history";
import { teamOf, useLeague } from "@/lib/league/use-league";
import { sharedResource } from "@/lib/shared-resource";
import type { SleeperDraft, SleeperDraftPick, SleeperTradedPick } from "@/lib/sleeper/types";

import "./league.css";

const STATUS: Record<SleeperDraft["status"], string> = {
  pre_draft: "Pre-draft",
  drafting: "Live",
  paused: "Paused",
  complete: "Complete",
};
// Poll while picks can still arrive: fast once it's under way.
const POLL: Partial<Record<SleeperDraft["status"], number>> = { drafting: 5_000, paused: 30_000, pre_draft: 30_000 };

const label = (c: Cell, teams: number) => `${c.round}.${String(c.pickNo - (c.round - 1) * teams).padStart(2, "0")}`;

function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const [d, h, m, sec] = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

interface Live {
  draft: SleeperDraft;
  picks: SleeperDraftPick[];
  traded: SleeperTradedPick[];
}

function useLiveDraft() {
  const [live, setLive] = useState<Live | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async (fresh: boolean) => {
      let every: number | undefined;
      try {
        const draft = latestDraft(await drafts());
        const [picks, traded] = draft
          ? await Promise.all([draftPicks(draft.draft_id, draft.status !== "complete", fresh), tradedPicks()])
          : [[], []];
        if (!mounted) return;
        setLive(draft && { draft, picks, traded });
        every = draft ? POLL[draft.status] : undefined;
      } catch (e) {
        // A failed poll keeps the board on screen and tries again; only the first load reports it.
        if (!mounted) return;
        if (!fresh) return setError((e as Error).message);
        every = POLL.drafting;
      }
      if (every) timer = setTimeout(() => void tick(true), every);
    };
    void tick(false);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  return { live, error };
}

function Countdown({ draft }: { draft: SleeperDraft }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (draft.status === "complete") return <span>Draft complete</span>;
  if (draft.status === "drafting") return <span>Draft in progress</span>;
  if (draft.status === "paused") return <span>Paused</span>;
  if (!draft.start_time) return <span>Not scheduled yet</span>;
  const left = draft.start_time - now;
  return <span className="tabular-nums">{left > 0 ? `Starts in ${countdown(left)}` : "Starting soon"}</span>;
}

interface Toggle<T extends string> {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}

function ToggleGroup<T extends string>({ label: name, value, options, onChange }: Toggle<T>) {
  return (
    <div role="group" aria-label={name} className="flex">
      {options.map(([v, text]) => (
        <button key={v} type="button" className="xp-button xp-toggle" aria-pressed={v === value} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function LiveTab() {
  const { live, error } = useLiveDraft();
  const { data, error: leagueError, teamFor, myRosterId } = useLeague();
  const [mine, setMine] = useState<"all" | "mine">("all");
  const [view, setView] = useState<"rounds" | "board">("rounds");

  const failed = error ?? leagueError;
  if (failed) return <p role="alert">Couldn&rsquo;t reach Sleeper ({failed}). Close the window and open it again to retry.</p>;
  if (live === undefined || !data) return <p role="status">Loading the draft...</p>;
  if (live === null) return <p>Sleeper has no draft for the {data.league.season} league yet.</p>;

  const { draft } = live;
  const { teams } = draft.settings;
  const board = draftBoard(draft, live.picks, live.traded, data.rosters);
  const isMine = (c: Cell) => myRosterId !== null && c.owner === myRosterId;
  const rounds = mine === "mine" ? board.map((r) => r.filter(isMine)).filter((r) => r.length > 0) : board;
  const owner = (id: number | null) => (id === null ? "TBD" : teamFor(id).name);

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="xp-group flex flex-wrap items-center gap-2">
        <span className="xp-tag">{STATUS[draft.status]}</span>
        <h3 className="font-bold">
          {draft.season} {draft.type === "snake" ? "snake" : "rookie"} draft
        </h3>
        <span className="ml-auto" aria-live="polite">
          <Countdown draft={draft} />
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <ToggleGroup
          label="Show"
          value={mine}
          options={[
            ["all", "All picks"],
            ["mine", "My picks"],
          ]}
          onChange={setMine}
        />
        <ToggleGroup
          label="Layout"
          value={view}
          options={[
            ["rounds", "Rounds"],
            ["board", "Board"],
          ]}
          onChange={setView}
        />
      </div>
      {mine === "mine" && myRosterId === null && <p>Link your Sleeper account in Settings to see your picks.</p>}
      {mine === "mine" && myRosterId !== null && rounds.length === 0 && <p>You hold no picks in this draft.</p>}
      {view === "rounds" ? (
        rounds.map((cells) => (
          <section key={cells[0].round} aria-label={`Round ${cells[0].round}`}>
            <h3 className="xp-round-title">Round {cells[0].round}</h3>
            <ol className="bg-(--xp-cream)">
              {cells.map((c) => (
                <li key={c.pickNo} className="xp-player-row" data-mine={isMine(c) || undefined}>
                  <span className="xp-player-pos tabular-nums">{label(c, teams)}</span>
                  <span className="xp-player-name">
                    {c.pick ? (
                      <>
                        {pickedName(c.pick)}{" "}
                        <span className="xp-player-team">
                          {c.pick.metadata.position} {c.pick.metadata.team || "FA"}
                        </span>
                      </>
                    ) : (
                      <span className="italic">On the board</span>
                    )}
                  </span>
                  <span className="xp-pick-owner">
                    {owner(c.owner)}
                    {c.from !== null && <span className="block text-xs">via {owner(c.from)}</span>}
                  </span>
                  {isMine(c) && <StarIcon className="shrink-0" role="img" aria-hidden={false} aria-label="Your pick" />}
                </li>
              ))}
            </ol>
          </section>
        ))
      ) : (
        <div className="xp-table-scroll">
          <table className="xp-table xp-board">
            <caption className="sr-only">
              {draft.season} draft board, one row per round
            </caption>
            <thead>
              <tr>
                <th scope="col">Rd</th>
                {Array.from({ length: teams }, (_, i) => (
                  <th key={i} scope="col" className="text-center">
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.map((cells) => (
                <tr key={cells[0].round}>
                  <th scope="row">{cells[0].round}</th>
                  {cells.map((c) => (
                    <td key={c.pickNo} data-mine={isMine(c) || undefined} data-dim={(mine === "mine" && !isMine(c)) || undefined}>
                      {c.pick ? (
                        <>
                          <span className="block font-bold">{c.pick.metadata.last_name || pickedName(c.pick)}</span>
                          <span className="block text-xs">{c.pick.metadata.position}</span>
                        </>
                      ) : (
                        <span className="block text-xs">{owner(c.owner)}</span>
                      )}
                      {isMine(c) && <span className="sr-only">(yours)</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Every finished draft in the league's history, newest first.
export const pastDrafts = sharedResource(async () => {
  const chain = await leagueChain();
  const seasons = await Promise.all(
    chain.map(async (l) => {
      const [list, u, r] = await Promise.all([drafts(l.league_id), users(l.league_id), rosters(l.league_id)]);
      const done = list.filter((d) => d.status === "complete");
      return Promise.all(done.map(async (d) => ({ draft: d, picks: await draftPicks(d.draft_id, false), users: u, rosters: r })));
    }),
  );
  return { status: "ok" as const, drafts: seasons.flat() };
});

function PicksTab() {
  const past = pastDrafts.use();
  const picker = useId();
  const [pick, setPick] = useState<string | null>(null);

  if (past.status === "error") return <p role="alert">Couldn&rsquo;t reach Sleeper ({past.message}). Close the window and open it again to retry.</p>;
  if (past.status !== "ok") return <p role="status">Loading past drafts...</p>;
  if (past.drafts.length === 0) return <p>No drafts have finished yet.</p>;
  const shown = past.drafts.find((d) => d.draft.draft_id === pick) ?? past.drafts[0];
  const rounds = [...new Set(shown.picks.map((p) => p.round))].sort((a, b) => a - b);
  const pickedBy = (p: SleeperDraftPick) =>
    teamOf(shown.users, shown.rosters.find((r) => r.roster_id === Number(p.roster_id)), Number(p.roster_id)).name;

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor={picker} className="font-bold">
          Draft
        </label>
        <select id={picker} className="xp-select" value={shown.draft.draft_id} onChange={(e) => setPick(e.target.value)}>
          {past.drafts.map((d) => (
            <option key={d.draft.draft_id} value={d.draft.draft_id}>
              {d.draft.season}
            </option>
          ))}
        </select>
        <span>
          {shown.draft.settings.rounds} rounds, {shown.draft.type}
        </span>
      </div>
      {shown.picks.length === 0 && <p>No picks were recorded for the {shown.draft.season} draft.</p>}
      {rounds.map((round) => (
        <section key={round} aria-label={`Round ${round}`}>
          <h3 className="xp-round-title">Round {round}</h3>
          <ol className="bg-(--xp-cream)">
            {shown.picks
              .filter((p) => p.round === round)
              .sort((a, b) => a.pick_no - b.pick_no)
              .map((p) => (
                <li key={p.pick_no} className="xp-player-row">
                  <span className="xp-player-pos tabular-nums">{p.pick_no}</span>
                  <span className="xp-player-name">
                    {pickedName(p)}{" "}
                    <span className="xp-player-team">
                      {p.metadata.position} {p.metadata.team || "FA"}
                    </span>
                  </span>
                  {p.is_keeper && <span className="xp-tag">Keeper</span>}
                  <span className="xp-pick-owner">{pickedBy(p)}</span>
                </li>
              ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function DraftHistoryWindow({ params }: { params: WindowParams }) {
  return (
    <Tabs
      label="Draft view"
      selected={params.tab}
      tabs={[
        { id: "live", label: "Live", panel: () => <LiveTab /> },
        { id: "picks", label: "Picks", panel: () => <PicksTab /> },
      ]}
    />
  );
}
