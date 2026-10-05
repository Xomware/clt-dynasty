import type { ReactNode } from "react";

// The league's rulebook and payouts, copied from the old site
// (rulebook.component.ts, payouts.component.ts). Edit here when a rule changes.

function RulesTable({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <table className="xp-table rules-table">
      <thead>
        <tr>
          <th scope="col">{head[0]}</th>
          <th scope="col">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b]) => (
          <tr key={a}>
            <td>{a}</td>
            <td>{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const Payouts = () => (
  <>
    <p>
      <strong>A. Dues</strong>: $100 per season.
    </p>
    <p>
      <strong>B. Payout structure</strong>
    </p>
    <RulesTable
      head={["Award", "Payout"]}
      rows={[
        ["Champion", "$600"],
        ["2nd place", "$200"],
        ["3rd place", "$80"],
        ["4th place", "$80"],
        ["Highest weekly score (x14)", "$10 each"],
        ["World Cup winner (every 4 years)", "$400"],
      ]}
    />
    <p>MVP awards for positional leaders (the player must have been started that week to count).</p>
  </>
);

export const RULEBOOK: { title: string; body: ReactNode }[] = [
  {
    title: "1. League Setup",
    body: (
      <>
        <p>
          <strong>A. Divisions</strong>
          <br />
          Three divisions of 4. Divisions are set for four years, then reset based on standings in the fourth
          year&rsquo;s regular season.
        </p>
        <p>
          <em>Division realignment by finish:</em>
          <br />
          ACC: #1 (winner), #6, #7, #12 (last)
          <br />
          SEC: #2, #5, #8, #11
          <br />
          Big 10: #3, #4, #9, #10
        </p>
        <p>
          <strong>World Cup Tournament</strong>
          <br />
          Every four years there is a season-long in-season tournament. The top 2 teams from each division over the
          first 3 years compete in a 6-team tournament during the 4th year. Only intra-divisional games count.
          Tiebreaker: overall record, then head-to-head, then total points.
        </p>
        <p>
          <em>Rounds:</em>
          <br />
          Round 1: total points weeks 3-6. Top 4 advance.
          <br />
          Round 2: #1 vs #4, #2 vs #3. Aggregate points weeks 7-10.
          <br />
          Round 3: winners&rsquo; aggregate points weeks 11-14.
        </p>
        <p>
          <strong>B. Fantasy host site</strong>: Sleeper.app
        </p>
      </>
    ),
  },
  {
    title: "2. Schedule & Season Format",
    body: (
      <>
        <p>
          <strong>A. Regular season</strong>
          <br />
          Week 14 is the last week of the regular season.
        </p>
        <p>
          <strong>B. Playoffs</strong>
          <br />
          Playoffs begin week 15 and end week 17 (1-week matchups). In a tie, the higher seed wins. 6 teams make the
          playoffs: the top team from each division is seeded 1-3, plus 3 wild card spots. Overall record determines
          standings; the tiebreaker is total points for.
        </p>
        <p>
          No consolation games or 3rd place match. Eliminated teams are ranked by seed at the time of elimination.
        </p>
        <p>
          <strong>C. Offseason</strong>
          <br />
          No free agency adds during the offseason, only via the rookie/FA draft. Trading of players and picks is
          allowed. Roster cuts are due by midnight the Sunday after the NFL preseason concludes.
        </p>
      </>
    ),
  },
  {
    title: "3. Roster Rules, Trading & Add/Drops",
    body: (
      <>
        <p>
          <strong>A. Roster sizes</strong>: 26 active + 4 taxi + 8 IR
        </p>
        <p>
          <strong>B. Starting requirements</strong>
          <br />1 QB, 2 RB, 2 WR, 1 TE, 2 FLEX (RB/WR/TE), 1 SUPERFLEX (QB/RB/WR/TE)
        </p>
        <p>
          No purposely starting bye, injured or inactive players to tank. Active players must be used. $5 penalty for
          playing an inactive player while tanking (goes to the winner&rsquo;s pot).
        </p>
        <p>
          <strong>C. Taxi squad steals</strong>
          <br />
          Teams can steal another team&rsquo;s taxi player with draft pick compensation:
        </p>
        <RulesTable
          head={["Round taken", "Minimum cost"]}
          rows={[
            ["1st", "1st + 2nd round pick"],
            ["2nd", "1st round pick"],
            ["3rd", "2nd round pick"],
            ["4th", "3rd round pick"],
            ["5th", "4th round pick"],
            ["Undrafted", "5th round pick"],
          ]}
        />
        <p>The owner can promote the taxi player before Thursday 12pm EST to nullify the steal.</p>
        <p>
          <strong>D. Injured reserve</strong>: 8 IR slots per team.
        </p>
        <p>
          <strong>E. Trading</strong>
          <br />
          Trades can be uneven. Rosters must be adjusted to 26 active immediately. Vetoes require a unanimous vote with
          evidence of collusion. Picks up to 2 years out can be traded.
        </p>
        <p>
          <strong>F. Trade deadline</strong>: 2 weeks after the NFL trade deadline (Tuesday after week 10 at noon).
        </p>
        <p>
          <strong>G. Add/drops</strong>: deadline at the conclusion of the regular season. No adds once the first game
          of the week starts.
        </p>
        <p>
          <strong>H. Roster cuts</strong>: by midnight Sunday after the NFL preseason. Max: 26 active + 4 taxi + 8 IR
          = 38 total.
        </p>
        <p>
          <strong>I. Waivers</strong>: dropped players clear waivers by Wednesday morning. Waiver order does not
          reset; claiming moves you to the back.
        </p>
      </>
    ),
  },
  {
    title: "4. Scoring",
    body: (
      <>
        <p>
          <strong>QB, RB, WR, TE scoring</strong>
        </p>
        <RulesTable
          head={["Event", "Points"]}
          rows={[
            ["Passing TD", "4 pts"],
            ["Passing yards", "1 per 25 yds (0.04/yd)"],
            ["Interception thrown", "-2 pts"],
            ["Pass 2PT conversion", "2 pts"],
            ["Rushing TD", "6 pts"],
            ["Rushing yards", "1 per 10 yds (0.1/yd)"],
            ["Rush 2PT conversion", "2 pts"],
            ["Receiving TD", "6 pts"],
            ["Receiving yards", "1 per 10 yds (0.1/yd)"],
            ["Receptions (PPR)", "1 pt (TE: 1.5 pts)"],
            ["Rec 2PT conversion", "2 pts"],
            ["Punt/kick return TD", "6 pts"],
            ["Fumble lost", "-2 pts"],
          ]}
        />
      </>
    ),
  },
  {
    title: "5. Draft Information",
    body: (
      <>
        <p>
          <strong>A. Startup draft</strong>: snake draft, order randomized.
        </p>
        <p>
          <strong>B. Rookie draft</strong>
          <br />
          Not a snake draft. Last place gets 1.01, 2.01, 3.01, 4.01, 5.01. Picks are tradeable. Any free agents not
          added before the championship add/drop deadline are also eligible.
        </p>
        <p>
          <strong>C. Draft order</strong>
          <br />
          Non-playoff teams: determined by overall record.
          <br />
          Playoff teams: determined by playoff performance. Eliminated teams with worse seeds get better picks.
        </p>
      </>
    ),
  },
  { title: "6. Dues & Payouts", body: <Payouts /> },
  {
    title: "7. Rule Changes",
    body: (
      <>
        <p>
          <strong>2/3 vote required</strong>
          <br />
          Rule change voting occurs in the offseason. At least 8 owners (of 12) must vote in favor for a rule change to
          become permanent.
        </p>
        <p>
          A <strong>100% unanimous vote</strong> can enact a rule effective immediately.
        </p>
      </>
    ),
  },
];
