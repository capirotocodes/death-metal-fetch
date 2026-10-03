import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell loads the hosted Next app (SQLite + poller live on the server).
 * Set CAPACITOR_SERVER_URL when syncing/building the Android project.
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://127.0.0.1:3847";

const config: CapacitorConfig = {
  appId: "app.deathmetalfetch.mobile",
  appName: "Death Metal Fetch",
  webDir: "capacitor-www",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#fff5fb",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#ff4d9a",
    },
  },
};

export default config;
