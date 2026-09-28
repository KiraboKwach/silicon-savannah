"use client";
import FleetActions from "./FleetActions";
import ProductCampus from "./ProductCampus";

import BuilderActions from "./BuilderActions";
import KnowledgePanel from "./KnowledgePanel";
import InitiativePanel from "./InitiativePanel";
import DiscoveryControls from "./DiscoveryControls";
import ProjectWork from "./ProjectWork";
import DashboardExtras from "./DashboardExtras";
import ProjectActivity from "./ProjectActivity";
import ProgressMeaning from "./ProgressMeaning";
import IdeaExchange from "./IdeaExchange";
import { useEffect, useState, type CSSProperties } from "react";
import { Activity, Clock, TriangleAlert, ArrowUpRight } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { liveWorld, type LiveSnapshot } from "@/lib/live";
import SiliconSavannahCanvas, { AgentAvatar } from "./SiliconSavannahCanvas";
function relative(ms: number) {
  if (!ms) return "No event yet";
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  return s < 60
    ? `${s}s ago`
    : s < 3600
      ? `${Math.floor(s / 60)}m ago`
      : s < 86400
        ? `${Math.floor(s / 3600)}h ago`
        : `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h ago`;
}
export default function LiveDashboard({
  onDemo,
  presentation,
}: {
  onDemo: () => void;
  presentation?: LiveSnapshot;
}) {
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      return Math.max(
        320,
        Math.min(520, Number(localStorage.getItem("savannah:panel-width")) || 390),
      );
    } catch {
      return 390;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("savannah:panel-width", String(panelWidth));
    } catch {}
  }, [panelWidth]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) setSelected(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const [viewFocus, setViewFocus] = useState<{
    projectId: string;
    taskId?: string;
    label: string;
    revision: number;
  } | null>(null);
  const [snapshotData, setData] = useState<LiveSnapshot | null>(null),
    [page, setPage] = useState(0),
    [connected, setConnected] = useState(false),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState<number | null>(null),
    [agentView, setAgentView] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (presentation) {
      setData(presentation);
      setConnected(true);
      setLoading(false);
      return;
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      try {
        const response = await fetch("/api/live", {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
        });
        if (!response.ok) throw Error("offline");
        const snapshot = (await response.json()) as LiveSnapshot;
        if (!snapshot.connected || !Array.isArray(snapshot.projects)) throw Error("invalid");
        if (!stopped) {
          setData(snapshot);
          setConnected(true);
        }
      } catch {
        if (!stopped) setConnected(false);
      } finally {
        if (!stopped) {
          setLoading(false);
          timer = setTimeout(poll, 2000);
        }
      }
    }
    void poll();
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [refresh, presentation]);
  const pages = Math.max(1, Math.ceil((snapshotData?.projects.length || 0) / 5)),
    currentPage = Math.min(page, pages - 1);
  const data = snapshotData
    ? {
        ...snapshotData,
        projects: snapshotData.projects.slice(currentPage * 5, currentPage * 5 + 5),
      }
    : null;
  const world = data ? liveWorld(data) : null;
  if (world && !connected) world.agents = world.agents.map((a) => ({ ...a, status: "offline" }));
  const selectedProject = selected !== null ? data?.projects[selected] : undefined,
    agent = selected !== null ? world?.agents[selected] : undefined;
  const inspect = (taskId: string | undefined, label: string, saved = false) => {
    if (selected === null || !world) return;
    const projectId = world.projects[selected]?.id;
    if (!projectId) return;
    setViewFocus((v) => ({
      projectId,
      taskId,
      label,
      revision: (v?.revision || 0) + (saved ? 1 : 0),
    }));
  };
  const stats = [
    {
      label: "Working",
      value: connected
        ? (snapshotData?.projects.filter((p) => p.status === "working").length ?? "—")
        : "—",
      Icon: Activity,
    },
    {
      label: "Idle",
      value: connected
        ? (snapshotData?.projects.filter((p) => p.status === "idle").length ?? "—")
        : "—",
      Icon: Clock,
    },
    {
      label: "Needs attention",
      value: connected
        ? (snapshotData?.projects.filter(
            (p) => ["blocked", "unknown"].includes(p.status) || p.signal?.kind === "attention",
          ).length ?? "—")
        : "—",
      Icon: TriangleAlert,
    },
  ];
  return (
    <main
      className={`dashboard landscape-dashboard desktop-command ${presentation ? "presentation-workspace" : ""} ${selected !== null ? "details-open" : ""}`}
      style={{ "--details-width": `${panelWidth}px` } as CSSProperties}
    >
      <header className="topbar">
        <div className="brand">
          <span className="brandmark">S</span>
          <div>
            Silicon Savannah<small>PROJECT COMMAND CENTRE</small>
          </div>
        </div>
        <div className="top-right">
          <a className="presentation-link" href={presentation ? "?mode=live" : "/"}>
            {presentation ? "Local workspace" : "Explore demo"}
          </a>
          <span className="location">
            Nairobi, KE <span>●</span>
          </span>
          <span className="demo-badge">
            {presentation
              ? "ANONYMIZED DEMO"
              : connected
                ? "LIVE · LOCAL CODEX"
                : loading
                  ? "CONNECTING"
                  : "DISCONNECTED"}
          </span>
        </div>
      </header>
      <section className="intro">
        <div>
          <p className="eyebrow">YOUR WORK, TAKING SHAPE</p>
          <h1>Your project landscape.</h1>
          <p>See what’s moving. Open a project for the details.</p>
        </div>
        <div className="mode-controls">
          <button aria-pressed="true">Live projects</button>
          <button onClick={onDemo}>Explore demo</button>
        </div>
      </section>
      {!connected && (
        <div className="connection-banner">
          <span>
            {connected
              ? `Connected to this computer · Refreshes every 2 seconds · Last checked ${new Date(data!.observedAt).toLocaleTimeString()}`
              : loading
                ? "Connecting to your local Codex activity…"
                : "Local connection unavailable. Live activity is paused."}
          </span>
          <button
            className="subtle"
            onClick={() => {
              setLoading(true);
              setRefresh((r) => r + 1);
            }}
          >
            Reconnect
          </button>
        </div>
      )}
      <section className="summary" aria-label="Live summary">
        {stats.map(({ label, value, Icon }) => (
          <div className="stat" key={label}>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
            <Icon size={20} />
          </div>
        ))}
      </section>
      {world && data ? (
        <>
          {!presentation && (
            <DiscoveryControls
              catalog={snapshotData?.catalog || snapshotData?.projects || []}
              memory={data.memory || []}
              page={currentPage}
              pages={pages}
              onPage={(p) => {
                setSelected(null);
                setPage(p);
              }}
              onRefresh={() => {
                setSelected(null);
                setRefresh((r) => r + 1);
              }}
              offline={!connected}
            />
          )}
          <div className="workspace landscape-workspace">
            <SiliconSavannahCanvas
              world={world}
              inspectionFocus={
                selected !== null && !agentView && world.projects[selected]
                  ? viewFocus?.projectId === world.projects[selected].id
                    ? viewFocus
                    : { projectId: world.projects[selected].id, label: selectedProject?.name }
                  : null
              }
              running={connected}
              live={
                connected
                  ? data
                  : { ...data, projects: data.projects.map((p) => ({ ...p, status: "offline" })) }
              }
              onProject={(id) => {
                setAgentView(false);
                setSelected(world.projects.findIndex((p) => p.id === id));
              }}
              onAgent={(id) => {
                setAgentView(true);
                setSelected(world.agents.findIndex((a) => a.id === id));
              }}
            />
          </div>
          {!presentation && (
            <>
              <FleetActions
                projects={snapshotData?.projects || []}
                connected={connected}
                onRefresh={() => setRefresh((r) => r + 1)}
              />
              <DashboardExtras
                data={data}
                world={world}
                connected={connected}
                onAgent={(i) => {
                  setAgentView(true);
                  setSelected(i);
                }}
                onRefresh={() => setRefresh((r) => r + 1)}
              />
            </>
          )}
        </>
      ) : (
        <div className="offline-panel">
          <span className="brandmark">S</span>
          <h2>{loading ? "Connecting to your builders" : "Bring your local projects into view"}</h2>
          <p>
            The live dashboard reads Codex activity on your computer. Open the local dashboard while
            Codex is running to watch agents and workflow steps update.
          </p>
          <a className="primary" href="http://127.0.0.1:4318/">
            Open local dashboard <ArrowUpRight size={16} />
          </a>
          <button className="subtle" onClick={onDemo}>
            Explore the animated demo
          </button>
          <small>
            If the local page is unavailable, run Start Silicon Savannah.cmd from the downloaded app
            folder.
          </small>
        </div>
      )}
      <footer className="footer">
        <span>
          HARAMBEE <b>·</b> Pulling together.
        </span>
        <span>Live local activity · Project reviews on request</span>
      </footer>
      {selected !== null && (
        <aside className="detail-sheet desktop-details" aria-label="Project details">
          <div className="details-toolbar">
            <strong>Project details</strong>
            <button onClick={() => setSelected(null)} aria-label="Close project details">
              Close ×
            </button>
          </div>
          <label className="panel-width-control">
            Panel width{" "}
            <input
              type="range"
              min="320"
              max="520"
              step="10"
              value={panelWidth}
              onChange={(e) => setPanelWidth(Number(e.target.value))}
            />
          </label>
          <div className="drawer-head">
            <p className="eyebrow">
              {presentation ? "SAMPLE PROJECT CONTEXT" : "LIVE PROJECT WORKFLOW"}
            </p>
            <h2 className="drawer-title">{selectedProject?.name || "Project"}</h2>
            <p>{selectedProject?.taskTitle || "Select a project"}</p>
          </div>
          {selectedProject && (
            <>
              {agent && (
                <div className="agent-profile">
                  <AgentAvatar agent={agent} />
                  <div>
                    <strong>Project agent</strong>
                    <p className={`status ${selectedProject.status}`}>
                      {connected ? selectedProject.status : "Disconnected"}
                    </p>
                  </div>
                </div>
              )}
              <div className="live-label">
                Last event {relative(selectedProject.lastAt)} ·{" "}
                {presentation
                  ? "Anonymous sample data"
                  : connected
                    ? "Connection live"
                    : "Last known data"}
              </div>
              {(selectedProject.publicLinks?.length || 0) > 1 && (
                <ProductCampus name={selectedProject.name} links={selectedProject.publicLinks!} />
              )}
              {!presentation && <BuilderActions project={selectedProject} connected={connected} />}
              <ProjectActivity
                project={selectedProject}
                now={Date.parse(data!.observedAt)}
                connected={connected}
              />
              <ProgressMeaning project={data?.memory?.find((p) => p.id === selectedProject.id)} />
              {!presentation && (
                <InitiativePanel
                  key={"initiative:" + selectedProject.id}
                  project={selectedProject}
                  offline={!connected}
                  onRefresh={() => setRefresh((r) => r + 1)}
                />
              )}
              <ProjectWork
                onInspect={inspect}
                selectedTaskId={viewFocus?.taskId}
                project={selectedProject}
                memory={data?.memory?.find((m) => m.id === selectedProject.id)}
              />
              {presentation && (
                <div className="presentation-task">
                  <p className="eyebrow">NEXT STEP · SAMPLE CONTEXT</p>
                  <h3>Review the next useful improvement.</h3>
                  <p>
                    Inspect the interface, agree on an acceptance check, then continue in Codex.
                  </p>
                  <span>No execution started by this demonstration.</span>
                </div>
              )}
              <h3 className="section-label">REPORTED TASK PLAN · UNVERIFIED</h3>
              {selectedProject.progress !== null ? (
                <>
                  <div className="drawer-progress">
                    <span>Reported steps complete</span>
                    <strong>{selectedProject.progress}%</strong>
                    <Progress value={selectedProject.progress} />
                  </div>
                  {selectedProject.plan.map((p) => (
                    <button
                      className="workflow-item"
                      key={p.id}
                      aria-pressed={viewFocus?.taskId === p.id}
                      onClick={() => inspect(p.id, p.title)}
                    >
                      {p.title}
                      <small>{p.status}</small>
                    </button>
                  ))}
                </>
              ) : (
                <p className="cultural-note">
                  This turn has no explicit task plan. Overall project completion is unknown; a
                  finished turn does not mean the whole project is complete.
                </p>
              )}
              {data?.memory?.find((p) => p.id === selectedProject.id) && (
                <KnowledgePanel
                  onInspect={inspect}
                  onSaved={() =>
                    inspect(viewFocus?.taskId, viewFocus?.label || selectedProject.name, true)
                  }
                  project={data.memory.find((p) => p.id === selectedProject.id)!}
                  agentId={agentView ? "codex:" + selectedProject.id : undefined}
                  offline={!connected}
                  onRefresh={() => setRefresh((r) => r + 1)}
                />
              )}
              {data?.memory && (
                <IdeaExchange
                  key={selectedProject.id}
                  projects={data.memory}
                  ideas={data.exchange || []}
                  projectId={selectedProject.id}
                  offline={!connected}
                  onRefresh={() => setRefresh((r) => r + 1)}
                />
              )}
              <h3 className="section-label">OBSERVED WORKFLOW EVENTS</h3>
              {selectedProject.steps.length ? (
                selectedProject.steps.map((step, i) => (
                  <div key={step.id + i} className="workflow-item">
                    <strong>{String(i + 1).padStart(2, "0")}</strong> {step.title}
                    <small>
                      {step.status} · {relative(step.time)}
                    </small>
                  </div>
                ))
              ) : (
                <p>No workflow events are available for this task yet.</p>
              )}
            </>
          )}
        </aside>
      )}
    </main>
  );
}
