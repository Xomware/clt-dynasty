"use client";

import { SLEEPER_TEAM_URL } from "@/components/home/YourWeek";
import { TaxiPlayerCard } from "@/components/taxi/TaxiPlayerCard";
import { LoadError } from "@/components/xp/LoadError";
import { Tabs } from "@/components/xp/Tabs";
import { TeamLink } from "@/components/xp/TeamLink";
import type { TaxiRequest } from "@/lib/api/taxi";
import type { WindowParams } from "@/lib/desktop/windows";
import type { Team } from "@/lib/league/use-league";
import { type AtRisk, atRisk, stealTargets } from "@/lib/taxi/market";
import { type TaxiEntry, useTaxiMarket } from "@/lib/taxi/use-taxi-market";
import type { SleeperRoster } from "@/lib/sleeper/types";

import "./players-page.css";
import "./taxi.css";

export const TAXI_TABS = ["targets", "risk", "all"] as const;

const RISK_TEXT = { requested: "Steal requested", high: "High risk", medium: "Watch" } as const;

// Rulebook 3C, quoted.
function StealRule() {
  return (
    <details className="tx-rule">
      <summary>
        <strong>The steal rule</strong> (rulebook 3C): the round below the one he was drafted in, a 5th if undrafted.
      </summary>
      <p>&ldquo;Teams can steal another team&rsquo;s taxi player with draft pick compensation:&rdquo;</p>
      <table className="xp-table tx-rule-table">
        <thead>
          <tr>
            <th scope="col">Round taken</th>
            <th scope="col">Minimum cost</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["1st", "1st + 2nd round pick"],
            ["2nd", "1st round pick"],
            ["3rd", "2nd round pick"],
            ["4th", "3rd round pick"],
            ["5th", "4th round pick"],
            ["Undrafted", "5th round pick"],
          ].map(([taken, cost]) => (
            <tr key={taken}>
              <td>{taken}</td>
              <td>{cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>&ldquo;The owner can promote the taxi player before Thursday 12pm EST to nullify the steal.&rdquo;</p>
      <p className="tx-note">
        The rulebook doesn&rsquo;t say which year&rsquo;s pick, so prices use your soonest one, from the next two drafts (picks up to two years
        out can be traded). The 2024 startup ran 30 rounds; a startup pick past the 5th costs the undrafted price. Values are FantasyCalc&rsquo;s,
        with a 5th estimated from the drop from 3rd to 4th.
      </p>
    </details>
  );
}

export function TaxiWindow({ params = {} }: { params?: WindowParams }) {
  const { board, market, error, retry, added } = useTaxiMarket();
  const { myRosterId: me, teamFor, data } = board;

  if (error) return <LoadError what="taxi squads" message={error} onRetry={retry} />;
  if (!market || !data) return <p role="status">Loading taxi squads, draft picks and values...</p>;
  if (market.entries.length === 0) return <p>No team has a player on its taxi squad right now.</p>;

  const card = { me, teamFor, seasons: market.seasons, week: board.week, onRequested: added };
  const noValues = !board.values;
  return (
    <div className="tx">
      <StealRule />
      {noValues && <p className="tx-note">FantasyCalc didn&rsquo;t answer, so prices show rounds without values.</p>}
      <Tabs
        label="Taxi views"
        selected={params.tab ?? (me === null ? "all" : "targets")}
        tabs={[
          { id: "targets", label: "Steal targets", panel: () => <Targets entries={market.entries} card={card} /> },
          { id: "risk", label: "At risk on your taxi", panel: () => <Risks entries={market.entries} card={card} roster={board.rosters?.find((r) => r.roster_id === me)} slots={data.league.roster_positions.length} /> },
          { id: "all", label: "All squads", panel: () => <Squads entries={market.entries} card={card} teamFor={teamFor} /> },
        ]}
      />
    </div>
  );
}

interface CardBase {
  me: number | null;
  teamFor: (rosterId: number) => Team;
  seasons: string[];
  week: number | null;
  onRequested: (r: TaxiRequest) => void;
}

function Targets({ entries, card }: { entries: TaxiEntry[]; card: CardBase }) {
  if (card.me === null) return <p>Link your Sleeper account in Settings to price steals with the picks you hold.</p>;
  const theirs = entries.filter((e) => e.player.rosterId !== card.me);
  const priced = theirs.flatMap((e) => (e.mine ? [{ ...e, assessment: e.mine }] : []));
  const targets = stealTargets(priced);
  const close = priced
    .filter((e) => !targets.includes(e))
    .sort((a, b) => b.assessment.ratio - a.assessment.ratio)
    .slice(0, 3);

  return (
    <div className="tx-sec">
      <p>
        Other teams&rsquo; taxi players worth at least 1.25x what you&rsquo;d pay with the picks you hold, biggest surplus first.
      </p>
      {targets.length === 0 ? (
        <p className="tx-empty">No taxi player is clearly worth more than his price to you right now.</p>
      ) : (
        <ul className="tx-list" aria-label="Steal targets">
          {targets.map((e) => (
            <TaxiPlayerCard key={e.player.id} entry={e} showOwner {...card} />
          ))}
        </ul>
      )}
      {close.length > 0 && (
        <>
          <h3 className="xp-round-title">Close calls</h3>
          <ul className="tx-list" aria-label="Close calls">
            {close.map((e) => (
              <TaxiPlayerCard key={e.player.id} entry={e} showOwner {...card} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

interface RisksProps {
  entries: TaxiEntry[];
  card: CardBase;
  roster: SleeperRoster | undefined;
  // Starters plus bench: the active roster's size.
  slots: number;
}

function Risks({ entries, card, roster, slots }: RisksProps) {
  if (card.me === null || !roster) return <p>Link your Sleeper account in Settings to see which of your taxi players are at risk.</p>;
  const mine = entries.filter((e) => e.player.rosterId === card.me);
  if (mine.length === 0) return <p>Your taxi squad is empty.</p>;
  const requested = new Set(mine.flatMap((e) => (e.request ? [e.player.id] : [])));
  const risks = atRisk(
    mine.flatMap((e) => (e.assessment ? [{ player: e.player, assessment: e.assessment, rounds: e.cost.rounds }] : [])),
    requested,
  );
  const flagged = new Set(risks.map((r) => r.player.id));
  const safe = mine.filter((e) => !flagged.has(e.player.id));
  const apart = new Set([...(roster.taxi ?? []), ...(roster.reserve ?? [])]);
  const open = slots - (roster.players ?? []).filter((id) => !apart.has(id)).length;
  const byId = new Map(mine.map((e) => [e.player.id, e]));

  return (
    <div className="tx-sec">
      <p>
        Your taxi players a rival would pay the price for: worth about their steal price or more, or already scoring like a starter.
      </p>
      {risks.length === 0 ? (
        <p className="tx-empty">None of your taxi players is worth his steal price right now.</p>
      ) : (
        <ul className="tx-list" aria-label="At risk">
          {risks.map((r) => (
            <TaxiPlayerCard key={r.player.id} entry={byId.get(r.player.id) as TaxiEntry} showOwner={false} {...card}>
              <RiskNote risk={r} open={open} />
            </TaxiPlayerCard>
          ))}
        </ul>
      )}
      {safe.length > 0 && (
        <>
          <h3 className="xp-round-title">Safe for now</h3>
          <ul className="tx-list" aria-label="Safe for now">
            {safe.map((e) => (
              <TaxiPlayerCard key={e.player.id} entry={e} showOwner={false} {...card} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function RiskNote({ risk, open }: { risk: AtRisk; open: number }) {
  return (
    <div className="tx-risk">
      <p>
        <span className="pl-verdict" data-verdict={risk.risk}>
          {RISK_TEXT[risk.risk]}
        </span>{" "}
        {risk.reason}
      </p>
      <p>
        To keep him, promote him to your active roster before Thursday 12pm ET; the rulebook says that nullifies a steal. It takes an active spot
        (you have {open > 0 ? `${open} open` : "none open, so someone has to go"}), and Sleeper won&rsquo;t put a promoted player back on the taxi
        squad.{" "}
        <a href={SLEEPER_TEAM_URL} target="_blank" rel="noreferrer">
          Promote in Sleeper<span className="sr-only"> (opens Sleeper)</span>
        </a>
      </p>
    </div>
  );
}

function Squads({ entries, card, teamFor }: { entries: TaxiEntry[]; card: CardBase; teamFor: (rosterId: number) => Team }) {
  const ids = [...new Set(entries.map((e) => e.player.rosterId))].sort((a, b) => Number(b === card.me) - Number(a === card.me) || a - b);
  return (
    <div className="tx-sec">
      {ids.map((id) => {
        const team = teamFor(id);
        return (
          <section key={id} aria-label={team.name}>
            <h3 className="xp-round-title">
              <TeamLink rosterId={id} name={team.name} avatarUrl={team.avatarUrl} isMine={id === card.me} />
            </h3>
            <ul className="tx-list">
              {entries
                .filter((e) => e.player.rosterId === id)
                .map((e) => (
                  <TaxiPlayerCard key={e.player.id} entry={e} showOwner={false} {...card} />
                ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
