import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Death Metal Fetch",
    short_name: "DM Fetch",
    description:
      "Unicorn-powered Bluesky metal release archive with WhatsApp alerts.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff5fb",
    theme_color: "#ff4d9a",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
