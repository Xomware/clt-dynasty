import { Skyline } from "@/components/intro/Skyline";

import "@/components/intro/intro.css";

// The night sky behind every Uptown page, with the skyline lit along the bottom.
export function Backdrop() {
  return (
    <div className="u-backdrop skyline-palette" aria-hidden>
      <i className="intro-stars" />
      <div className="u-backdrop-city">
        <Skyline uid="up" />
      </div>
    </div>
  );
}
