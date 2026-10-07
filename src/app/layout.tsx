import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { BASE_PATH } from "@/lib/base-path";
import "./globals.css";

const display = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Death Metal Fetch",
  description:
    "A sparkly little phone app that hoards Death Metal / Grindcore / Black Metal Bluesky drops and pings WhatsApp when something new lands.",
  applicationName: "Death Metal Fetch",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DM Fetch",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: `${BASE_PATH}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${BASE_PATH}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${BASE_PATH}/icons/apple-touch-icon.png`, sizes: "180x180" }],
  },
  manifest: `${BASE_PATH}/manifest.webmanifest`,
};

export const viewport: Viewport = {
  themeColor: "#ff4d9a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
