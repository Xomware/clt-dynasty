"use client";

import { useReducedMotion } from "@/lib/use-reduced-motion";

import { CrownIcon } from "./icons";
import "./brand-loader.css";

interface BrandLoaderProps {
  label: string;
}

// XP's boot screen: the mark over a sunken track with three blocks marching
// through it. Under reduced motion the blocks sit still in the middle.
export function BrandLoader({ label }: BrandLoaderProps) {
  const still = useReducedMotion();
  return (
    <div className="brand-loader">
      <CrownIcon width={64} height={64} />
      <p className="brand-loader-name" aria-hidden="true">
        CLT Dynasty
      </p>
      <div className={`brand-loader-track ${still ? "brand-loader-still" : "brand-loader-run"}`} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p role="status" className="brand-loader-label">
        {label}
      </p>
    </div>
  );
}
