import type { Metadata, Viewport } from "next";

import { AuthGate } from "@/components/auth/auth-gate";
import { Intro } from "@/components/intro/Intro";
import { HEAD_SCRIPT } from "@/lib/intro/seen";

import "./globals.css";

export const metadata: Metadata = {
  title: "CLT Dynasty League",
  description: "Standings, scores, drafts and rule proposals for the CLT Dynasty League.",
  // A private league's site: keep it out of search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The head script sets data-intro before hydration.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <Intro />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
