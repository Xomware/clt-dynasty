import { type Designation, designationText, sidelined } from "@/lib/nfl/injury";

import "./players.css";

interface InjuryBadgeProps {
  designation: Designation;
  bodyPart?: string | null;
}

export function InjuryBadge({ designation, bodyPart }: InjuryBadgeProps) {
  const text = designationText(designation, bodyPart);
  return (
    <span className="xp-injury" data-level={designation.code === "Q" ? "q" : sidelined(designation) ? "out" : "d"} title={text}>
      <span aria-hidden>{designation.code}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
