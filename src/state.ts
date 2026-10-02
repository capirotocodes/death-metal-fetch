import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type State = {
  lastSeenUri: string | null;
  lastSeenAt: string | null;
  updatedAt: string | null;
};

const DEFAULT_STATE: State = {
  lastSeenUri: null,
  lastSeenAt: null,
  updatedAt: null,
};

function statePath(): string {
  return (
    process.env.STATE_FILE?.trim() ||
    path.join(process.cwd(), "data", "state.json")
  );
}

export async function loadState(): Promise<State> {
  const file = statePath();
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      lastSeenUri: parsed.lastSeenUri ?? null,
      lastSeenAt: parsed.lastSeenAt ?? null,
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { ...DEFAULT_STATE };
    throw err;
  }
}

export async function saveState(state: State): Promise<void> {
  const file = statePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(state, null, 2) + "\n", "utf8");
}
