import { useEffect, useRef, useState } from "react";
import type { LiveSnapshot } from "@/lib/live";
import type { World } from "@/lib/simulation";
import { api } from "@/lib/memory";

export default function HqConsole({
  open,
  onClose,
  live,
  world,
  connected,
}: {
  open: boolean;
  onClose: () => void;
  live?: LiveSnapshot;
  world: World;
  connected: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [projectId, setProjectId] = useState(""),
    [draft, setDraft] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const projects = live?.projects || [];
  const project = projects.find((p) => p.id === projectId) || projects[0];
  const agent = world.agents[projects.findIndex((p) => p.id === project?.id)];
  const draftKey = project ? "savannah:hq-draft:" + project.id : null;
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    setMessage("");
    try {
      setDraft(draftKey ? localStorage.getItem(draftKey) || "" : "");
    } catch {
      setDraft("");
    }
  }, [draftKey]);
  function update(value: string) {
    setDraft(value);
    setMessage("Draft · not sent");
    try {
      if (draftKey) localStorage.setItem(draftKey, value);
    } catch {
      setMessage("Draft is in this window only; browser storage unavailable.");
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setMessage("Copied · open the project in Codex, paste, and send.");
    } catch {
      setMessage("Could not copy. Select the draft text and copy it manually.");
    }
  }
  async function review() {
    if (!project) return;
    setBusy(true);
    setMessage("Sending next-task review request…");
    try {
      await api("/api/initiative", { projectId: project.id, action: "review" });
      setMessage("Review request accepted · awaiting the live status update.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="hq-console"
      onCancel={onClose}
      aria-labelledby="hq-console-title"
    >
      <header>
        <div>
          <span className="eyebrow">AGENT HQ · COMMAND TABLE</span>
          <h2 id="hq-console-title">What shall we build next?</h2>
        </div>
        <button onClick={onClose} aria-label="Close HQ table">
          ×
        </button>
      </header>
      <label>
        Choose a project agent
        <select value={project?.id || ""} onChange={(e) => setProjectId(e.target.value)}>
          {projects.map((p, i) => (
            <option key={p.id} value={p.id}>
              {world.agents[i]?.name || "Agent"} · {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="hq-agent-status">
        <span className="hq-avatar-letter">{agent?.name[0] || "H"}</span>
        <div>
          <strong>
            {agent?.name || "HQ"} · {project?.name || "Live projects required"}
          </strong>
          <small>
            {connected
              ? project?.stage || "No observed activity"
              : "Disconnected · execution unavailable"}
          </small>
        </div>
      </div>
      <label>
        Task draft
        <textarea
          rows={5}
          maxLength={4000}
          value={draft}
          disabled={!project}
          onChange={(e) => update(e.target.value)}
          placeholder="Describe the outcome you want, the relevant app, and how you will know it works."
        />
      </label>
      <p className="hq-help">
        Saved on this browser. Copy the draft and send it in the project’s Codex task; this table
        does not silently execute freeform instructions.
      </p>
      <div className="hq-console-actions">
        <button disabled={!draft.trim()} onClick={copy}>
          Copy task draft
        </button>
        {project?.codexUrl && <a href={project.codexUrl}>Open project in Codex ↗</a>}
      </div>
      <div className="hq-review">
        <strong>Need a starting point?</strong>
        <p>
          Run the existing read-only review to suggest the next task. Uses your Codex allowance; up
          to three minutes. The draft above is not submitted to this review.
        </p>
        <button
          disabled={!project || !connected || busy || project.initiative?.status === "running"}
          onClick={review}
        >
          {busy
            ? "Sending…"
            : project?.initiative?.status === "running"
              ? "Review running…"
              : "Find next task"}
        </button>
        {project?.initiative && <small>{project.initiative.stage}</small>}
        {project?.initiative?.report && (
          <details>
            <summary>Read latest review</summary>
            <p>{project.initiative.report}</p>
          </details>
        )}
      </div>
      {message && (
        <p role="status" className="hq-message">
          {message}
        </p>
      )}
    </dialog>
  );
}
