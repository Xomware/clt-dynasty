"use client";

import { type ReactNode, useState } from "react";

import { Who } from "@/components/players/PlayerResults";
import { TeamLink } from "@/components/xp/TeamLink";
import { useAlerts } from "@/lib/alerts/alerts";
import { requestSteal, type TaxiRequest } from "@/lib/api/taxi";
import type { Team } from "@/lib/league/use-league";
import { type Assessment, type Pick, roundsLabel } from "@/lib/taxi/market";
import type { TaxiEntry } from "@/lib/taxi/use-taxi-market";
import { ordinal } from "@/lib/team/team";

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const int = (n: number) => Math.round(n).toLocaleString("en-US");
const signed = (n: number) => `${n > 0 ? "+" : ""}${int(n)}`;

const VERDICT_TEXT = { bargain: "Bargain", fair: "Fair price", overpay: "Overpay" } as const;
// The same verdict for my own player, from the stealer's side.
const OWN_TEXT = { bargain: "Cheap to steal", fair: "Fairly priced", overpay: "Pricey to steal" } as const;

function pickText(p: Pick, me: number | null, teamFor: (rosterId: number) => Team) {
  return `${p.season} ${ordinal(p.round)} (${p.original === me ? "your own" : `from ${teamFor(p.original).name}`})`;
}

// "Steal for": the picks I'd hand over, or the rounds owed when I can't price it.
export function priceText(e: TaxiEntry, me: number | null, teamFor: (rosterId: number) => Team, seasons: string[]): string {
  const owed = roundsLabel(e.cost.rounds);
  if (!e.payment) return owed;
  if (e.payment.missing.length) return `${owed}, but you hold no ${e.payment.missing.map((r) => ordinal(r)).join(" or ")} or better in ${seasons.join(" or ")}`;
  const better = e.payment.picks.some((p, i) => p.round < e.cost.rounds[i]);
  return `${e.payment.picks.map((p) => pickText(p, me, teamFor)).join(" + ")}${better ? `, a better round than the ${e.cost.rounds.map((r) => ordinal(r)).join(" and ")} owed` : ""}`;
}

function VerdictLine({ a, own }: { a: Assessment; own: boolean }) {
  return (
    <span className="pl-worth tx-verdict">
      <span className="pl-verdict" data-verdict={a.verdict}>
        {(own ? OWN_TEXT : VERDICT_TEXT)[a.verdict]}
      </span>
      <span className="pl-why" title="FantasyCalc dynasty value plus 50 per point a game, against FantasyCalc's value of the picks">
        Worth {int(a.worth)} vs {int(a.price)} in picks ({a.ratio.toFixed(1)}x)
      </span>
    </span>
  );
}

function RequestLine({ request }: { request: TaxiRequest }) {
  return (
    <p className="tx-request">
      Steal requested by {request.isMine ? "you" : request.requestedBy || "a former member"}, {DATE.format(new Date(request.createdAt))}
    </p>
  );
}

interface CardProps {
  entry: TaxiEntry;
  me: number | null;
  teamFor: (rosterId: number) => Team;
  seasons: string[];
  week: number | null;
  showOwner: boolean;
  onRequested: (r: TaxiRequest) => void;
  // Extra lines for the view: the at-risk reason and remedy, a target's case.
  children?: ReactNode;
}

// One taxi player's case: where he was drafted, his value and scoring, the
// steal price and whether it's worth paying.
export function TaxiPlayerCard({ entry: e, me, teamFor, seasons, week, showOwner, onRequested, children }: CardProps) {
  const mine = e.player.rosterId === me;
  const owner = teamFor(e.player.rosterId);
  const verdict = e.mine ?? e.assessment;
  const r = e.row;
  const stats: [string, string, string][] = [
    ["Value", r.value ? int(r.value) : "-", "Dynasty value (FantasyCalc)"],
    ["Rank", e.rank ? `#${e.rank}` : "-", "FantasyCalc overall rank"],
    ["30 days", e.trend ? signed(e.trend) : "-", "Value change over 30 days"],
    ["Age", r.age === null ? "-" : String(r.age), "Age"],
    ["Pts", r.pts === null ? "-" : r.pts.toFixed(1), "Season points, CLT scoring"],
    ["PPG", r.ppg === null ? "-" : r.ppg.toFixed(1), "Points per game"],
    ...(week === null ? [] : [[`Wk ${week}`, r.proj === null ? "-" : r.proj.toFixed(1), `Week ${week} projection`] as [string, string, string]]),
  ];

  return (
    <li className="pl-card tx-card" data-mine={mine || undefined}>
      <div className="pl-card-head">
        <Who row={r} />
        {showOwner && <TeamLink rosterId={e.player.rosterId} name={owner.name} avatarUrl={owner.avatarUrl} isMine={mine} />}
      </div>
      <p className="tx-meta">
        {e.cost.basis}
        {e.player.depth && <>. {e.player.depth}</>}
      </p>
      <dl className="pl-card-stats tx-stats">
        {stats.map(([label, value, title]) => (
          <div key={label}>
            <dt title={title}>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="tx-price">
        <p>
          <strong>{mine || me === null ? "Steal price:" : "Steal for:"}</strong> {mine ? roundsLabel(e.cost.rounds) : priceText(e, me, teamFor, seasons)}
        </p>
        {verdict && <VerdictLine a={verdict} own={mine} />}
      </div>
      {children}
      {e.request ? (
        <RequestLine request={e.request} />
      ) : (
        !mine && me !== null && <StealButton entry={e} owner={owner.name} price={priceText(e, me, teamFor, seasons)} onRequested={onRequested} />
      )}
    </li>
  );
}

interface StealButtonProps {
  entry: TaxiEntry;
  owner: string;
  price: string;
  onRequested: (r: TaxiRequest) => void;
}

function StealButton({ entry: e, owner, price, onRequested }: StealButtonProps) {
  const { alert } = useAlerts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = e.row.name;

  const steal = async () => {
    const value = e.payment && e.payment.missing.length === 0 ? `, worth ${int(e.payment.value)} on FantasyCalc` : "";
    const answer = await alert({
      kind: "warning",
      title: "Request a steal",
      body: `Steal ${name} from ${owner}? You give up ${price}${value}. The league is told, the request can't be taken back here, and ${owner} can promote him before Thursday 12pm ET to cancel it.`,
      buttons: ["Request steal", "Cancel"],
    });
    if (answer !== "Request steal") return;
    setBusy(true);
    setError(null);
    await requestSteal(e.player.id).then(onRequested, (err: Error) => setError(err.message));
    setBusy(false);
  };

  return (
    <div className="tx-act">
      <button
        type="button"
        className="xp-button"
        aria-label={`Request steal: ${name}`}
        disabled={busy}
        onClick={(ev) => {
          // Safari never focuses a clicked button, and the dialog restores focus to its opener.
          ev.currentTarget.focus();
          void steal();
        }}
      >
        {busy ? "Requesting..." : "Request steal"}
      </button>
      {error && <p role="alert">Couldn&rsquo;t request the steal: {error}</p>}
    </div>
  );
}
