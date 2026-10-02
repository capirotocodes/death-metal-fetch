import { ReleaseList } from "@/components/release-list";

export default function Home() {
  return (
    <main className="shell">
      <header className="hero">
        <p className="brand">Death Metal Fetch</p>
        <h1>Release archive from the underground feed.</h1>
        <p className="lede">
          Watching kmanriffs.bsky.social for Death Metal, Grindcore, and Black
          Metal — stored locally, WhatsApp when something new drops.
        </p>
      </header>
      <ReleaseList />
    </main>
  );
}
