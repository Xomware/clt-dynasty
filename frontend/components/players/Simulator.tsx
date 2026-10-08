"use client";

import { type FormEvent, useId, useMemo, useState } from "react";

import { SLEEPER_TEAM_URL } from "@/components/home/YourWeek";
import { DrillLink } from "@/components/xp/DrillLink";
import { RosterMoveIcon } from "@/components/xp/icons";
import { PlayerLink } from "@/components/xp/PlayerLink";
import { playerName } from "@/lib/api/players";
import { cleanQuery, encode } from "@/lib/players/params";
import type { PlayerRow } from "@/lib/players/rows";
import { MAX_SAVED, useSavedScenarios } from "@/lib/players/scenarios";
import { EMPTY_SCENARIO, isEmpty, limitsOf, MOVE_KINDS, type MoveKind, type Problem, type Scenario, type SimFor, type Side, type Simulation, writeScenario } from "@/lib/players/simulate";
import type { Team } from "@/lib/league/use-league";
import { TradeDesk } from "./TradeDesk";
import type { PlayerBoard } from "@/lib/players/use-player-board";
import type { SleeperRoster } from "@/lib/sleeper/types";
import type { Verdict, Worth } from "@/lib/players/worth";
import { searchPlayers } from "@/lib/search/nfl";
import { slotLabel } from "@/lib/team/team";
import { Who, WorthBadge } from "./PlayerResults";

const pts = (n: number) => n.toFixed(1);
const int = (n: number) => Math.round(n).toLocaleString("en-US");
const signed = (n: number, f: (n: number) => string) => (n > 0 ? `+${f(n)}` : n < 0 ? `-${f(-n)}` : "no change");
const SHOWN = 8;

export const VERBS: Record<MoveKind, string> = { adds: "Add", drops: "Drop", ir: "IR", send: "Send", receive: "Get" };
const VERDICT_ORDER: Verdict[] = ["starter", "depth", "stash", "none"];

interface SimulatorProps {
  board: PlayerBoard;
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
  onToggle: (kind: MoveKind, id: string) => void;
  worth: ((id: string) => Worth | null) | null;
  simFor: SimFor;
}

export function Simulator({ board, scenario, onScenario, onToggle, worth, simFor }: SimulatorProps) {
  const { data, myRosterId, rows } = board;
  const byId = useMemo(() => new Map((rows ?? []).map((r) => [r.id, r])), [rows]);
  const name = (id: string) => byId.get(id)?.name ?? playerName(board.players?.[id], id);

  if (data && myRosterId === null) {
    return (
      <p>
        Link your Sleeper account to try adds and drops on your team.{" "}
        <DrillLink to={{ kind: "settings", params: {} }}>Link it in Settings</DrillLink>
      </p>
    );
  }
  if (!simFor || !rows || !data) return <p role="status">Loading your roster and this week&rsquo;s projections...</p>;
  const sim = simFor(scenario);
  if (!sim) return <p role="status">Loading your roster...</p>;

  return (
    <div className="sim">
      <p className="pl-note">
        Try adds, drops, IR moves and trades on your team and see this week&rsquo;s best lineup, your depth and your
        dynasty value before you make them. Nothing here changes Sleeper.
      </p>
      <Moves scenario={scenario} name={name} onToggle={onToggle} partner={scenario.partner === null ? null : board.teamFor(scenario.partner)} />
      {!isEmpty(scenario) && <Results sim={sim} scenario={scenario} board={board} name={name} onClear={() => onScenario(EMPTY_SCENARIO)} />}
      <div className="sim-pickers">
        <FreeAgents rows={rows} players={board.players} scenario={scenario} onToggle={onToggle} worth={worth} />
        <MyRoster roster={board.rosters?.find((r) => r.roster_id === myRosterId)} byId={byId} scenario={scenario} onToggle={onToggle} irStatuses={limitsOf(data.league).irStatuses}
          trading={scenario.partner !== null}
        />
        <TradeDesk board={board} byId={byId} scenario={scenario} onScenario={onScenario} onToggle={onToggle} />
      </div>
    </div>
  );
}

interface MovesProps {
  scenario: Scenario;
  partner: Team | null;
  name: (id: string) => string;
  onToggle: (kind: MoveKind, id: string) => void;
}

function Moves({ scenario, partner, name, onToggle }: MovesProps) {
  const moves = MOVE_KINDS.flatMap((kind) => scenario[kind].map((id) => ({ kind, id, verb: VERBS[kind] })));
  return (
    <section className="sim-sec" aria-label="Your moves">
      <h3 className="sim-title">Your moves</h3>
      {moves.length === 0 ? (
        <p>No moves yet. Pick free agents to add and players to drop below, or from the Players tab.</p>
      ) : (
        <ul className="sim-moves">
          {moves.map((m) => (
            <li key={`${m.kind}:${m.id}`} className="sim-move" data-kind={m.kind}>
              <span className="sim-move-verb">{m.verb}</span>
              <PlayerLink id={m.id} className="sim-move-name">
                {name(m.id)}
              </PlayerLink>
              {partner && (m.kind === "send" || m.kind === "receive") && (
                <span className="sim-move-team">
                  {m.kind === "send" ? "to" : "from"} {partner.name}
                </span>
              )}
              <button type="button" className="sim-x" aria-label={`Undo ${m.verb.toLowerCase()} ${name(m.id)}`} onClick={() => onToggle(m.kind, m.id)}>
                Undo
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface ResultsProps {
  sim: Simulation;
  scenario: Scenario;
  board: PlayerBoard;
  name: (id: string) => string;
  onClear: () => void;
}

function Results({ sim, scenario, board, name, onClear }: ResultsProps) {
  const { mine, depth, problems } = sim;
  const limits = limitsOf(board.data!.league);
  const lineupDelta = Math.round((mine.afterPoints - mine.beforePoints) * 10) / 10;
  const valueDelta = mine.valueAfter - mine.valueBefore;
  const link = (id: string | null) => (id ? <PlayerLink id={id}>{name(id)}</PlayerLink> : <span className="sim-empty">Empty</span>);

  return (
    <section className="sim-sec" aria-label="What it does">
      <h3 className="sim-title">What it does</h3>
      <dl className="sim-totals" aria-live="polite">
        <div>
          <dt>{board.week === null ? "Best lineup" : `Best lineup, Week ${board.week}`}</dt>
          <dd>
            {pts(mine.beforePoints)} to {pts(mine.afterPoints)}
            <span className="sim-delta" data-sign={Math.sign(lineupDelta)}>
              {signed(lineupDelta, pts)}
            </span>
          </dd>
        </div>
        <div>
          <dt>Dynasty value</dt>
          <dd>
            {int(mine.valueBefore)} to {int(mine.valueAfter)}
            <span className="sim-delta" data-sign={Math.sign(valueDelta)}>
              {signed(valueDelta, int)}
            </span>
          </dd>
        </div>
        <div>
          <dt>Roster</dt>
          <dd className="sim-counts">
            <span data-over={mine.counts.active > limits.active || undefined}>
              Active {mine.counts.active}/{limits.active}
            </span>
            <span data-over={mine.counts.taxi > limits.taxi || undefined}>
              Taxi {mine.counts.taxi}/{limits.taxi}
            </span>
            <span data-over={mine.counts.ir > limits.ir || undefined}>
              IR {mine.counts.ir}/{limits.ir}
            </span>
          </dd>
        </div>
      </dl>
      {sim.partner && <PartnerSide side={sim.partner} team={board.teamFor(sim.partner.rosterId)} active={limits.active} />}

      {problems.length > 0 ? (
        <ul className="sim-problems" role="alert">
          {problems.map((p) => (
            <li key={p.kind === "over" ? `over:${p.spot}:${p.partner ?? ""}` : `${p.kind}:${p.id}`}>
              {problemText(p, name, limits, sim.partner ? board.teamFor(sim.partner.rosterId).name : "")}
            </li>
          ))}
        </ul>
      ) : (
        <p className="sim-ok">Legal: every move fits CLT&rsquo;s roster limits.</p>
      )}

      <div className="sim-tables">
        <table className="xp-table sim-lineup">
          <caption>Best lineup this week</caption>
          <thead>
            <tr>
              <th scope="col" className="sim-slot">
                Slot
              </th>
              <th scope="col">Now</th>
              <th scope="col">With these moves</th>
            </tr>
          </thead>
          <tbody>
            {board.slots.map((slot, i) => {
              const changed = mine.changed.includes(i);
              return (
                <tr key={i} data-changed={changed || undefined}>
                  <th scope="row" className="sim-slot">
                    {slotLabel(slot)}
                  </th>
                  <td>{link(mine.before[i])}</td>
                  <td>
                    {link(mine.after[i])}
                    {changed && <span className="sr-only"> (changed)</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <table className="xp-table sim-depth">
          <caption>Depth with these moves, IR apart</caption>
          <thead>
            <tr>
              <th scope="col" className="sim-slot">
                Pos
              </th>
              <th scope="col" className="text-right">
                Players
              </th>
              <th scope="col" className="text-right">
                Value
              </th>
              <th scope="col" className="text-right">
                League avg<span className="sr-only"> players and value</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {depth.map((d) => (
              <tr key={d.position} data-changed={d.before.count !== d.after.count || d.before.value !== d.after.value || undefined}>
                <th scope="row">{d.position}</th>
                <td className="text-right tabular-nums">
                  {d.after.count}
                  {d.before.count !== d.after.count && <span className="sim-change">{signed(d.after.count - d.before.count, String)}</span>}
                </td>
                <td className="text-right tabular-nums">
                  {int(d.after.value)}
                  {d.before.value !== d.after.value && <span className="sim-change">{signed(d.after.value - d.before.value, int)}</span>}
                </td>
                <td className="text-right tabular-nums">
                  {d.league.count} / {int(d.league.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SaveForm scenario={scenario} />
      <div className="sim-actions">
        <a className="xp-button" href={SLEEPER_TEAM_URL} target="_blank" rel="noreferrer">
          <RosterMoveIcon width={20} height={20} className="flex-none" aria-hidden />
          Make it real in Sleeper
          <span className="sr-only"> (opens Sleeper)</span>
        </a>
        <button type="button" className="xp-button" onClick={onClear}>
          Clear all moves
        </button>
      </div>
      <p className="pl-note">CLT Dynasty can&rsquo;t make moves for you. Sleeper does the adds, drops and IR moves, and has the final say.</p>
    </section>
  );
}

// What the trade does to the other team, so it reads as an offer they might take.
function PartnerSide({ side, team, active }: { side: Side; team: Team; active: number }) {
  const lineup = Math.round((side.afterPoints - side.beforePoints) * 10) / 10;
  const value = side.valueAfter - side.valueBefore;
  return (
    <div className="sim-partner">
      <h4 className="sim-group-title">Their side: {team.name}</h4>
      <dl className="sim-totals">
        <div>
          <dt>Their best lineup</dt>
          <dd>
            {pts(side.beforePoints)} to {pts(side.afterPoints)}
            <span className="sim-delta" data-sign={Math.sign(lineup)}>
              {signed(lineup, pts)}
            </span>
          </dd>
        </div>
        <div>
          <dt>Their dynasty value</dt>
          <dd>
            {int(side.valueBefore)} to {int(side.valueAfter)}
            <span className="sim-delta" data-sign={Math.sign(value)}>
              {signed(value, int)}
            </span>
          </dd>
        </div>
        <div>
          <dt>Their roster</dt>
          <dd className="sim-counts">
            <span data-over={side.counts.active > active || undefined}>
              Active {side.counts.active}/{active}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function problemText(p: Problem, name: (id: string) => string, limits: ReturnType<typeof limitsOf>, partner: string): string {
  switch (p.kind) {
    case "rostered":
      return `${name(p.id)} is already on a CLT roster.`;
    case "not-mine":
      return `${name(p.id)} isn't on your roster.`;
    case "not-theirs":
      return `${name(p.id)} isn't on ${partner || "their"} roster.`;
    case "locked":
      return `${name(p.id)}'s game has kicked off, so Sleeper locks him until it ends.`;
    case "not-ir-eligible":
      return `${name(p.id)} can't go on IR: CLT's IR takes ${limits.irStatuses.join(", ")} designations.`;
    case "over": {
      const spot = { active: "active roster", taxi: "taxi squad", ir: "IR" }[p.spot];
      if (p.partner) return `${partner} would be ${p.by} over the ${limits[p.spot]}-player ${spot} and have to drop ${p.by}.`;
      const more = p.spot === "active" ? ` Drop ${p.by} more or move an injured player to IR.` : "";
      return `${p.by} over the ${limits[p.spot]}-player ${spot}.${more}`;
    }
  }
}

function SaveForm({ scenario }: { scenario: Scenario }) {
  const id = useId();
  const saved = useSavedScenarios();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const label = title.trim() || `Scenario ${saved.list.length + 1}`;
    const ok = saved.save(label, encode(writeScenario(scenario)));
    setNote(ok ? `Saved "${label}". Compare it on the Saved tab.` : "This browser wouldn't save it (private browsing or full storage).");
    if (ok) setTitle("");
  };
  return (
    <form className="sim-save" onSubmit={submit}>
      <label htmlFor={`${id}-name`} className="font-bold">
        Save this scenario
      </label>
      <div className="sim-save-row">
        <input id={`${id}-name`} className="xp-input" value={title} maxLength={40} placeholder={`Scenario ${saved.list.length + 1}`} onChange={(e) => setTitle(e.target.value)} />
        <button type="submit" className="xp-button">
          Save
        </button>
      </div>
      <p className="pl-note" aria-live="polite">
        {note || `Keeps up to ${MAX_SAVED} on this device; the oldest goes first.`}
      </p>
    </form>
  );
}

interface FreeAgentsProps {
  rows: PlayerRow[];
  players: PlayerBoard["players"];
  scenario: Scenario;
  onToggle: (kind: MoveKind, id: string) => void;
  worth: ((id: string) => Worth | null) | null;
}

// Free agents to pick from: the best fits for my team first, or whoever the search finds.
function FreeAgents({ rows, players, scenario, onToggle, worth }: FreeAgentsProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(SHOWN);
  const list = useMemo(() => {
    const free = rows.filter((r) => r.owner === null);
    const q = cleanQuery(query).trim();
    if (q && players) {
      const hits = new Set(searchPlayers(players, q, 400).map((h) => h.item.player_id));
      return free.filter((r) => hits.has(r.id)).sort((a, b) => (b.proj ?? 0) - (a.proj ?? 0) || b.value - a.value);
    }
    const rank = (r: PlayerRow) => VERDICT_ORDER.indexOf(worth?.(r.id)?.verdict ?? "none");
    return free.filter((r) => (r.proj ?? 0) > 0 || r.value > 0).sort((a, b) => rank(a) - rank(b) || (b.proj ?? 0) - (a.proj ?? 0) || b.value - a.value);
  }, [rows, players, query, worth]);

  return (
    <section className="sim-sec" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="sim-title">
        Add a free agent
      </h3>
      <label htmlFor={`${id}-q`} className="sr-only">
        Search free agents
      </label>
      <input
        id={`${id}-q`}
        type="search"
        className="xp-input"
        placeholder="Search free agents"
        value={query}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setShown(SHOWN);
        }}
      />
      {list.length === 0 ? (
        <p>No free agent matches.</p>
      ) : (
        <ul className="sim-picks">
          {list.slice(0, shown).map((r) => {
            const on = scenario.adds.includes(r.id);
            return (
              <li key={r.id} className="sim-pick">
                <Who row={r} />
                <span className="sim-pick-stats">
                  {r.proj !== null && <span>{pts(r.proj)} pts</span>}
                  <span>{int(r.value)} value</span>
                </span>
                {worth && <WorthBadge worth={worth(r.id)} />}
                <button type="button" className="pl-act" data-kind="adds" aria-pressed={on} aria-label={`Add ${r.name}`} onClick={() => onToggle("adds", r.id)}>
                  {on ? "Added" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {list.length > shown && (
        <button type="button" className="xp-button pl-more" onClick={() => setShown((n) => n + SHOWN)}>
          Show more free agents
        </button>
      )}
    </section>
  );
}

interface MyRosterProps {
  roster: SleeperRoster | undefined;
  byId: Map<string, PlayerRow>;
  scenario: Scenario;
  onToggle: (kind: MoveKind, id: string) => void;
  irStatuses: string[];
  // A trade partner is picked, so my players can be sent.
  trading: boolean;
}

// My roster as Sleeper has it now, by spot, each player droppable and the
// IR-eligible ones movable to IR.
function MyRoster({ roster, byId, scenario, onToggle, irStatuses, trading }: MyRosterProps) {
  const id = useId();
  const taxi = roster?.taxi ?? [];
  const ir = roster?.reserve ?? [];
  const groups = [
    { label: "Active", ids: (roster?.players ?? []).filter((p) => !taxi.includes(p) && !ir.includes(p)) },
    { label: "Taxi", ids: taxi },
    { label: "IR", ids: ir },
  ];
  const sort = (ids: string[]) => ids.flatMap((p) => byId.get(p) ?? []).sort((a, b) => b.value - a.value);

  return (
    <section className="sim-sec" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="sim-title">
        {trading ? "Drop, move to IR or send" : "Drop, or move to IR"}
      </h3>
      {groups.map((g) =>
        g.ids.length === 0 ? null : (
          <div key={g.label} className="sim-group">
            <h4 className="sim-group-title">{g.label}</h4>
            <ul className="sim-picks">
              {sort(g.ids).map((r) => {
                const dropped = scenario.drops.includes(r.id);
                const toIr = scenario.ir.includes(r.id);
                const sent = scenario.send.includes(r.id);
                const canIr = g.label === "Active" && irStatuses.includes(r.player.injury_status ?? "");
                return (
                  <li key={r.id} className="sim-pick" data-out={dropped || sent || undefined}>
                    <Who row={r} />
                    <span className="sim-pick-stats">
                      {r.proj !== null && <span>{pts(r.proj)} pts</span>}
                      <span>{int(r.value)} value</span>
                    </span>
                    <span className="sim-pick-acts">
                      {canIr && (
                        <button type="button" className="pl-act" data-kind="ir" aria-pressed={toIr} aria-label={`Move ${r.name} to IR`} onClick={() => onToggle("ir", r.id)}>
                          {toIr ? "To IR" : "IR"}
                        </button>
                      )}
                      {trading && (
                        <button type="button" className="pl-act" data-kind="send" aria-pressed={sent} aria-label={`Send ${r.name}`} onClick={() => onToggle("send", r.id)}>
                          {sent ? "Sent" : "Send"}
                        </button>
                      )}
                      <button type="button" className="pl-act" data-kind="drops" aria-pressed={dropped} aria-label={`Drop ${r.name}`} onClick={() => onToggle("drops", r.id)}>
                        {dropped ? "Dropped" : "Drop"}
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ),
      )}
    </section>
  );
}
