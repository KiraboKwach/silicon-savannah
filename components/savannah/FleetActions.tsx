import { useState } from "react";
import type { LiveProject } from "@/lib/live";
import { api } from "@/lib/memory";
export default function FleetActions({
  projects,
  connected,
  onRefresh,
}: {
  projects: LiveProject[];
  connected: boolean;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [results, setResults] = useState<{ name: string; text: string }[]>([]);
  const eligible = projects.filter((p) => p.initiative?.status !== "running");
  return (
    <section id="fleet-dispatch" tabIndex={-1} className="fleet-dispatch">
      <div>
        <span className="eyebrow">HQ · PROJECT DISPATCH</span>
        <h3>Find the next task across your projects</h3>
        <p>
          Runs one independent, read-only Codex review per project concurrently. Uses your Codex
          allowance; each review runs for up to three minutes.
        </p>
      </div>
      <button
        disabled={!connected || busy || !eligible.length}
        onClick={async () => {
          setBusy(true);
          setResults([]);
          try {
            await Promise.allSettled(
              eligible.map(async (p) => {
                try {
                  await api("/api/initiative", { projectId: p.id, action: "review" });
                  setResults((r) => [...r, { name: p.name, text: "Review started" }]);
                } catch (e) {
                  setResults((r) => [...r, { name: p.name, text: (e as Error).message }]);
                }
              }),
            );
            onRefresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Dispatching…" : `Find next task · ${eligible.length} projects`}
      </button>
      <div role="status">
        {results.map((r) => (
          <p key={r.name}>
            <strong>{r.name}</strong> · {r.text}
          </p>
        ))}
      </div>
      <small>
        {projects.filter((p) => p.initiative?.status === "running").length} reviews running ·
        Reports appear in each project’s details. Existing reviews are skipped.
      </small>
    </section>
  );
}
