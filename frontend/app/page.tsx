import { CrownIcon } from "@/components/xp/icons";
import { Window } from "@/components/xp/Window";

export default function Home() {
  return (
    <main className="xp-page min-h-dvh justify-center">
      <Window title="CLT Dynasty League" icon={<CrownIcon />} controls>
        <div className="flex items-center gap-4 p-2">
          <CrownIcon width={48} height={48} className="flex-none" />
          <div>
            <h1 className="text-base font-bold">CLT Dynasty League &mdash; new site coming together</h1>
            <p className="mt-1">Standings, drafts and rule proposals move here one window at a time.</p>
          </div>
        </div>
      </Window>
    </main>
  );
}
