import type { Metadata, Viewport } from "next";

import { AuthGate } from "@/components/auth/auth-gate";
import { BuzzIntro } from "@/components/intro/BuzzIntro";
import { Intro } from "@/components/intro/Intro";
import { HEAD_SCRIPT } from "@/lib/intro/seen";
import { THEME_SCRIPT } from "@/lib/theme/script";
import { ThemeProvider } from "@/lib/theme/theme";

import "./globals.css";
import "@/components/xp/stack-table.css";

export const metadata: Metadata = {
  title: "CLT Dynasty League",
  description: "Standings, scores, drafts and rule proposals for the CLT Dynasty League.",
  // A private league's site: keep it out of search results.
  robots: { index: false, follow: false },
  metadataBase: new URL("https://clt.dynasty.xomware.com"),
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
  openGraph: {
    title: "CLT Dynasty League",
    description: "Charlotte's dynasty fantasy football league. Twelve teams, Superflex, full PPR.",
    siteName: "CLT Dynasty",
    type: "website",
    images: [{ url: "/brand/og.jpg", width: 1200, height: 630, alt: "CLT Dynasty Fantasy Football: the hornet lounging on a football" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The head scripts set data-intro and data-theme before hydration.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT + THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          {/* Both prerendered; CSS shows the one for the theme the head script set. */}
          <Intro />
          <BuzzIntro />
          <AuthGate>{children}</AuthGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
