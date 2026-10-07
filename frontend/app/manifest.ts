import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CLT Dynasty League",
    short_name: "CLT Dynasty",
    start_url: "/",
    display: "standalone",
    background_color: "#170d31",
    theme_color: "#170d31",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
