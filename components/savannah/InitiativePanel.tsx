import { useState } from "react";
import type { LiveProject } from "@/lib/live";
import { api } from "@/lib/memory";
const options = [
  ["review", "Find next task", "Recommend one useful next step."],
  ["blockers", "Investigate blockers", "Find what is holding this project back."],
  ["ideas", "Find reusable ideas", "Assess ideas shared across projects."],
  ["tests", "Prepare test plan", "Define checks for the current work."],
];
export default function InitiativePanel({
  project,
  offline,
  onRefresh,
}: {
  project: LiveProject;
  offline: boolean;
  onRefresh: () => void;
}) {
  const [action, setAction] = useState("review"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = project.initiative;
  return (
    <section id="builder-give-task" tabIndex={-1} className="initiative-panel">
      <span className="eyebrow">AGENT CAPABILITIES</span>
      <h3>Give this builder a task</h3>
      <div className="capability-options">
        {options.map(([id, label, description]) => (
          <button
            key={id}
            aria-pressed={action === id}
            disabled={busy || run?.status === "running"}
            onClick={() => setAction(id)}
          >
            <strong>{label}</strong>
            <small>{description}</small>
          </button>
        ))}
      </div>
      <small>
        Real Codex review · uses your allowance · up to three minutes. Reads project files and
        returns a report; no edits or deployments.
      </small>
      <button
        className="primary"
        disabled={offline || busy || run?.status === "running"}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await api("/api/initiative", { projectId: project.id, action });
            onRefresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy || run?.status === "running"
          ? "Builder is working…"
          : "Start: " + options.find((o) => o[0] === action)?.[1]}
      </button>
      {error && (
        <p role="alert" className="memory-error">
          {error}
        </p>
      )}
      {run && (
        <div className="initiative-result">
          <b>{run.stage}</b>
          <small>{new Date(run.startedAt).toLocaleString()}</small>
          {run.report && <p>{run.report}</p>}
        </div>
      )}
    </section>
  );
}
