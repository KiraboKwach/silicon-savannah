import { useState } from "react";
import { api, type MemoryProject } from "@/lib/memory";
import type { LiveProject } from "@/lib/live";
export default function DiscoveryControls({
  catalog,
  memory,
  page,
  pages,
  onPage,
  onRefresh,
  offline,
}: {
  catalog: (LiveProject & { hidden?: boolean })[];
  memory: MemoryProject[];
  page: number;
  pages: number;
  onPage: (page: number) => void;
  onRefresh: () => void;
  offline: boolean;
}) {
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  async function toggle(id: string, hidden: boolean) {
    const p = memory.find((p) => p.id === id);
    if (!p) return;
    setBusy(id);
    setError("");
    try {
      await api("/api/memory/command", {
        projectId: id,
        operation: "set_visibility",
        input: { hidden },
        revision: p.revision,
        key: crypto.randomUUID(),
      });
      onRefresh();
    } catch (e) {
      setError((e as Error).message);
      onRefresh();
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="discovery-controls">
      <div className="discovery-heading">
        <div>
          <strong>Automatic discovery is on</strong>
          <small>
            New local Codex tasks appear within 15 seconds while this dashboard is open. Each
            conversation gets a hub; helper agents are excluded.
          </small>
        </div>
        <div className="landscape-pagination">
          <button disabled={page === 0} onClick={() => onPage(page - 1)}>
            ←
          </button>
          <span>
            Landscape {page + 1} / {pages}
          </span>
          <button disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
            →
          </button>
        </div>
      </div>
      <details>
        <summary>
          Manage projects · {catalog.filter((p) => !p.hidden).length} shown ·{" "}
          {catalog.filter((p) => p.hidden).length} hidden
        </summary>
        {error && <p role="alert">{error}</p>}
        <div className="discovery-projects">
          {catalog.map((p) => (
            <div key={p.id}>
              <span title={p.taskTitle}>{p.name}</span>
              <button disabled={!!busy || offline} onClick={() => toggle(p.id, !p.hidden)}>
                {busy === p.id ? "Saving…" : p.hidden ? "Show" : "Hide"}
              </button>
            </div>
          ))}
        </div>
        <small>
          Hiding only changes this dashboard. Your Codex task and its saved memory stay intact.
        </small>
      </details>
    </section>
  );
}
