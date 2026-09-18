"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { AgentStatus } from "@/lib/simulation";
import type { World } from "@/lib/simulation";
import BuilderCharacter from "./BuilderCharacter";
import { builderSpecialties, builderPersonas } from "./builder-appearance";

type StatusPreview = {
  status: AgentStatus;
  label: string;
  micro: "idle" | "focus" | "scan" | "fidget" | "tired" | "rest";
  activeWhenRunning: boolean;
};

const PREVIEW_STATES: StatusPreview[] = [
  { status: "idle", label: "Idle", micro: "idle", activeWhenRunning: false },
  { status: "assigned", label: "Assigned", micro: "focus", activeWhenRunning: true },
  { status: "moving", label: "Moving", micro: "scan", activeWhenRunning: true },
  { status: "working", label: "Working", micro: "focus", activeWhenRunning: true },
  { status: "completed", label: "Completed", micro: "rest", activeWhenRunning: false },
  { status: "blocked", label: "Blocked", micro: "fidget", activeWhenRunning: false },
  { status: "waiting", label: "Waiting", micro: "tired", activeWhenRunning: false },
  { status: "unknown", label: "Unknown", micro: "idle", activeWhenRunning: false },
  { status: "offline", label: "Offline", micro: "idle", activeWhenRunning: false },
];

const STATUS_GLYPH: Record<AgentStatus, string> = {
  idle: "◦",
  assigned: "◆",
  moving: "→",
  working: "⚒",
  completed: "✓",
  blocked: "✕",
  unknown: "?",
  waiting: "…",
  offline: "⦿",
};

function asLiveAgent(agentId: string, status: AgentStatus, seedAgent: World["agents"][number]) {
  return {
    ...seedAgent,
    id: agentId,
    status,
    currentProjectId: undefined,
    currentTaskId: undefined,
    destination: undefined,
  };
}

export default function BuilderCharacterLineup({ agents }: { agents: World["agents"] }) {
  const systemReduced = useReducedMotion();
  const [forceReduced, setForceReduced] = useState(false);
  const reduced = systemReduced || forceReduced;
  const [previewStatus, setPreviewStatus] = useState<AgentStatus>("working");
  const [animate, setAnimate] = useState(false);
  const [seatedPreview, setSeatedPreview] = useState(false);
  const [previewSignal, setPreviewSignal] = useState("reading");
  const sortedAgents = useMemo(
    () =>
      agents
        .slice()
        .sort(
          (left, right) => Number(left.id.replace(/\D/g, "")) - Number(right.id.replace(/\D/g, "")),
        ),
    [agents],
  );

  return (
    <section className="builder-character-lineup" aria-label="Developer lineup">
      <div className="lineup-heading">
        <h2>Builder character lineup</h2>
        <span>DEVELOPMENT PREVIEW · A0–A9</span>
      </div>
      <p className="lineup-note">
        All ten agents are rendered with the current silhouette, prop set and pose rules. Lower rows
        are task-state previews only for review; they do not drive real execution.
      </p>
      <label>
        Preview state{" "}
        <select
          value={previewStatus}
          onChange={(event) => setPreviewStatus(event.target.value as AgentStatus)}
        >
          {PREVIEW_STATES.map((item) => (
            <option key={item.status} value={item.status}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={animate}
          onChange={(event) => setAnimate(event.target.checked)}
          disabled={!!reduced}
        />{" "}
        Animate preview
      </label>
      <label>
        <input
          type="checkbox"
          checked={seatedPreview}
          onChange={(e) => setSeatedPreview(e.target.checked)}
        />{" "}
        Seated preview
      </label>
      <label>
        <input
          type="checkbox"
          checked={forceReduced}
          onChange={(e) => setForceReduced(e.target.checked)}
        />{" "}
        Reduced motion preview
      </label>
      <label>
        Observed activity{" "}
        <select value={previewSignal} onChange={(e) => setPreviewSignal(e.target.value)}>
          {["reading", "editing", "testing", "command", "working"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <p className="lineup-note">
        100 × 180 px · normal map size; 46 × 83 px thumbnail ·{" "}
        {reduced ? "Reduced motion enabled" : "Motion optional"} · synthetic visual fixtures only
      </p>
      <div className="lineup-grid" role="list">
        {sortedAgents.map((agent) => (
          <article key={agent.id} className="lineup-card" role="listitem">
            <div className="lineup-card-head">
              <strong>{agent.id}</strong>
              <span className={`agent-status-marker ${agent.status}`}>
                {STATUS_GLYPH[agent.status]}
              </span>
              <span className="lineup-name">{agent.name}</span>
            </div>

            <p className="lineup-note">
              {builderPersonas[agent.id as keyof typeof builderPersonas]?.persona}
              <br />
              {builderSpecialties[agent.id]}
            </p>

            <div className="lineup-main-view" title={`${agent.name} · ${agent.type}`}>
              <BuilderCharacter
                agent={{ ...agent, status: "idle" }}
                active={false}
                seated={false}
                state="idle"
              />
            </div>

            <div className="lineup-silhouette" title={`Silhouette profile: ${agent.name}`}>
              <BuilderCharacter
                agent={{ ...agent, status: "idle" }}
                active={false}
                seated={false}
                state="idle"
              />
            </div>

            <div className="lineup-small-view">
              <BuilderCharacter agent={{ ...agent, status: "idle" }} active={false} />
            </div>
            <div className="lineup-state-label">State previews (fixtures)</div>
            <div className="lineup-state-grid">
              {PREVIEW_STATES.filter((preview) => preview.status === previewStatus).map(
                (preview) => {
                  const previewAgent = asLiveAgent(agent.id, preview.status, agent);
                  const shouldAnimate = animate && preview.activeWhenRunning && !reduced;

                  return (
                    <div key={`${agent.id}-${preview.status}`} className="lineup-state-item">
                      <span className={`agent-status-marker ${preview.status}`} aria-hidden="true">
                        {STATUS_GLYPH[preview.status]}
                      </span>
                      <span className="lineup-state-label-text">{preview.label}</span>
                      <BuilderCharacter
                        agent={previewAgent}
                        appearanceId={agent.id}
                        signal={previewSignal}
                        active={shouldAnimate}
                        seated={seatedPreview}
                        state={preview.micro}
                      />
                    </div>
                  );
                },
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
