"use client";

import { LoadError } from "@/components/xp/LoadError";
import { listProposals } from "@/lib/api/proposals";
import { useLoad } from "@/lib/use-load";
import { HomeCard } from "./HomeCard";

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function ProposalsCard() {
  const [load, retry] = useLoad(listProposals, "proposals");
  const open = load.status === "ok" ? load.value.filter((p) => p.status === "open") : [];
  // The list arrives open first, then newest, so the first row is the newest still being voted on.
  const newest = load.status === "ok" ? load.value[0] : undefined;

  return (
    <HomeCard title="Rule proposals" more={{ to: { kind: "proposals", params: {} }, label: "Vote" }}>
      {load.status === "loading" && <p role="status">Loading proposals...</p>}
      {load.status === "error" && <LoadError what="proposals" message={load.message} onRetry={retry} />}
      {load.status === "ok" && !newest && <p>No rule proposals yet. Anyone in the league can make one.</p>}
      {newest && (
        <>
          <p className="home-big">
            {open.length} <span className="home-big-label">open for votes</span>
          </p>
          <div className="home-proposal">
            <p className="flex flex-wrap items-center gap-2">
              <span className="xp-tag">{newest.status === "open" ? "Newest open" : "Latest"}</span>
              <span className="text-xs">{DATE.format(new Date(newest.createdAt))}</span>
            </p>
            <p className="font-bold">{newest.title}</p>
            <p className="text-xs">
              {newest.yesCount} yes, {newest.noCount} no
              {newest.status === "open" && (newest.myVote ? `, you voted ${newest.myVote}` : ", you haven't voted")}
            </p>
          </div>
        </>
      )}
    </HomeCard>
  );
}
