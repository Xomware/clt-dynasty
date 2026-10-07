"use client";

import { BrandMark } from "@/components/buzz/BrandMark";
import { BuzzLoader } from "@/components/buzz/BuzzLoader";
import { useReducedMotion } from "@/lib/use-reduced-motion";

import "./brand-loader.css";

interface BrandLoaderProps {
  label: string;
}

// XP's boot screen: the league's seal over a sunken track with three blocks
// marching through it. Under reduced motion the blocks sit still in the middle.
export function BrandLoader({ label }: BrandLoaderProps) {
  const still = useReducedMotion();
  return (
    <>
    <div className="brand-loader">
      <BrandMark mark="seal" alt="" height={112} className="brand-loader-seal" priority />
      <div className={`brand-loader-track ${still ? "brand-loader-still" : "brand-loader-run"}`} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="brand-loader-label" aria-hidden="true">
        {label}
      </p>
    </div>
    <BuzzLoader label={label} />
    {/* One announcement for both themes' art, only one of which CSS shows. */}
    <p role="status" className="sr-only">
      {label}
    </p>
    </>
  );
}
