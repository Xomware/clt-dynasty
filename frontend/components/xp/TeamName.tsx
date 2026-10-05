import Image from "next/image";

import { StarIcon } from "./icons";

interface TeamNameProps {
  name: string;
  avatarUrl?: string | null;
  isMine?: boolean;
}

// A team's avatar and name, starred when it is the signed-in member's.
export function TeamName({ name, avatarUrl, isMine = false }: TeamNameProps) {
  return (
    <span className="xp-team">
      <span className="xp-avatar overflow-hidden" aria-hidden>
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={28} height={28} unoptimized className="size-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </span>
      <span className="xp-team-name">{name}</span>
      {isMine && <StarIcon className="shrink-0" role="img" aria-hidden={false} aria-label="Your team" />}
    </span>
  );
}
