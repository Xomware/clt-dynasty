import type { TaxiMarket } from "@/lib/taxi/use-taxi-market";
import { ordinal } from "@/lib/team/team";

const STEAL = { bargain: "Steal: bargain", fair: "Steal: fair price", overpay: "Steal: overpay" } as const;
const RISK = { requested: "Steal requested", high: "At risk", medium: "Watch" } as const;

// The Players page's verdict for a taxi player: is he worth stealing at my
// price, or is my own at risk.
export function taxiBadges({ entries, risks }: NonNullable<TaxiMarket["market"]>, me: number | null) {
  const risk = new Map(risks.map((r) => [r.player.id, r]));
  const byId = new Map(entries.map((e) => [e.player.id, e]));
  return function badge(id: string) {
    const e = byId.get(id);
    if (!e) return null;
    if (e.player.rosterId === me) {
      const r = risk.get(id);
      return (
        <span className="pl-worth">
          <span className="pl-verdict" data-verdict={r ? r.risk : "overpay"}>
            {r ? RISK[r.risk] : "Safe on taxi"}
          </span>
          <span className="pl-why">{r ? r.reason : `Costs ${e.cost.rounds.map((n) => `a ${ordinal(n)}`).join(" and ")} to steal`}</span>
        </span>
      );
    }
    if (e.request) {
      return (
        <span className="pl-worth">
          <span className="pl-verdict" data-verdict="requested">
            Steal requested
          </span>
          <span className="pl-why">By {e.request.isMine ? "you" : e.request.requestedBy || "a former member"}</span>
        </span>
      );
    }
    if (!e.mine || !e.payment) return null;
    return (
      <span className="pl-worth">
        <span className="pl-verdict" data-verdict={e.mine.verdict}>
          {STEAL[e.mine.verdict]}
        </span>
        <span className="pl-why">
          {e.payment.picks.map((p) => `${p.season} ${ordinal(p.round)}`).join(" + ")}, {e.mine.ratio.toFixed(1)}x the picks
        </span>
      </span>
    );
  };
}
