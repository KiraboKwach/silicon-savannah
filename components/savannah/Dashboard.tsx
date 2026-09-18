"use client";

import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  ArrowUpRight,
  Layers,
  Users,
  CheckCheck,
  Activity,
  TriangleAlert,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { api, demoWorld, type MemorySnapshot } from "@/lib/memory";
import SiliconSavannahCanvas, { AgentAvatar } from "./SiliconSavannahCanvas";
import KnowledgePanel from "./KnowledgePanel";
import BuilderCharacterLineup from "./BuilderCharacterLineup";

const AGENT_STATUS_GLYPH: Record<string, string> = {
  idle: "◦",
  assigned: "◆",
  moving: "→",
  working: "⚒",
  completed: "✓",
  blocked: "!",
  unknown: "?",
  waiting: "…",
  offline: "⦿",
};

export default function Dashboard() {
  const [data, setData] = useState<MemorySnapshot | null>(null);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [viewFocus, setViewFocus] = useState<{
    taskId?: string;
    label?: string;
    revision?: number;
  }>({});
  const [selection, setSelection] = useState<{ type: "project" | "agent"; id: string } | null>(
    null,
  );

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const value = await api<MemorySnapshot>("/api/memory?mode=demo");
        if (!stop) {
          setData(value);
          setOnline(true);
        }
      } catch {
        if (!stop) setOnline(false);
      } finally {
        if (!stop) {
          timer = setTimeout(poll, 1000);
        }
      }
    }

    void poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [refresh]);

  const world = data ? demoWorld(data.projects, online, data.demo.running) : null;
  const agent =
    selection?.type === "agent" ? world?.agents.find((a) => a.id === selection.id) : undefined;

  const project =
    selection?.type === "project"
      ? data?.projects.find((_, i) => world?.projects[i].id === selection.id)
      : agent
        ? data?.projects.find(
            (p) =>
              p.tasks.some(
                (task) =>
                  task.owner === `demo:${agent.id}` &&
                  ["assigned", "in_progress", "in_review", "blocked"].includes(task.status),
              ) || p.id === data.projects[0]?.id,
          )
        : undefined;

  async function control(input: unknown) {
    setError("");

    try {
      await api("/api/memory/demo", input);
      setRefresh((r) => r + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const tasks = data?.projects.flatMap((p) => p.tasks) || [];
  const stats = [
    { label: "Projects", value: data?.projects.length || 0, Icon: Layers },
    { label: "Builders", value: world?.agents.length || 0, Icon: Users },
    {
      label: "Accepted tasks",
      value: tasks.filter((t) => t.status === "completed").length,
      Icon: CheckCheck,
    },
    {
      label: "Awaiting review",
      value: tasks.filter((t) => t.status === "in_review").length,
      Icon: Activity,
    },
    {
      label: "Blocked",
      value: tasks.filter((t) => t.status === "blocked").length,
      Icon: TriangleAlert,
    },
  ];

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand">
          <span className="brandmark">S</span>
          <div>
            Silicon Savannah
            <small>PROJECT COMMAND CENTRE</small>
          </div>
        </div>
        <span className="demo-badge">SHARED DEMO · SYNTHETIC EXECUTION</span>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">CONTEXT BEFORE ACTION. EVIDENCE BEFORE COMPLETION.</p>
          <h1>Great ideas. Built together.</h1>
          <p>Ten builders share persistent tasks, briefings and handoffs.</p>
        </div>
        <div className="controls">
          <button
            className="speed-button"
            disabled={!online}
            onClick={() =>
              control({ speed: data?.demo.speed === 1 ? 2 : data?.demo.speed === 2 ? 4 : 1 })
            }
          >
            {data?.demo.speed || 1}×
          </button>
          <button
            className="primary"
            disabled={!online}
            onClick={() => control({ running: !data?.demo.running })}
          >
            {data?.demo.running ? <Pause size={16} /> : <Play size={16} />}
            {data?.demo.running ? "Pause demo executor" : "Run demo executor"}
          </button>
        </div>
      </section>

      <div className="connection-banner">
        {online
          ? "Shared local memory connected. Demo results need evidence review before buildings advance."
          : "Local memory unavailable. Demo execution and animation are paused."}
      </div>

      {error && (
        <p role="alert" className="memory-error">
          {error}
        </p>
      )}

      <section className="summary">
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
          <section className="workspace">
            <SiliconSavannahCanvas
              world={world}
              memories={data.projects}
              inspectionFocus={
                selection?.type === "project" ? { projectId: selection.id, ...viewFocus } : null
              }
              running={online && data.demo.running}
              onProject={(id) => setSelection({ type: "project", id })}
              onAgent={(id) => setSelection({ type: "agent", id })}
            />
            <aside className="project-panel">
              <div className="panel-heading">
                <h2>Shared task pulse</h2>
                <span>DEMO</span>
              </div>
              {data.projects.map((p, i) => (
                <button
                  className="project-row"
                  key={p.id}
                  onClick={() => setSelection({ type: "project", id: world.projects[i].id })}
                >
                  <span className="project-index" style={{ color: world.projects[i].color }}>
                    0{i + 1}
                  </span>
                  <div className="project-info">
                    <strong>{p.name}</strong>
                    <small>
                      {p.summary.completed} accepted · {p.summary.review} in review
                    </small>
                    <Progress value={p.summary.progress ?? 0} />
                  </div>
                  <div className="project-percent">
                    {p.summary.progress === null ? "No tasks" : p.summary.progress + "%"}
                    <ArrowUpRight size={15} />
                  </div>
                </button>
              ))}
              <div className="pulse-note">
                The executor checks synthetic manifests.
                <p>
                  It does not build or change your real projects. Animation never changes task
                  progress.
                </p>
              </div>
            </aside>
          </section>

          {process.env.NODE_ENV !== "production" ? (
            <BuilderCharacterLineup agents={world.agents} />
          ) : null}

          <section className="bottom-grid">
            <div className="builders-panel">
              <div className="panel-heading">
                <h2>The builders / 10</h2>
                <span>SHARED OWNERSHIP</span>
              </div>
              <div className="builders-grid">
                {world.agents.map((a) => (
                  <button
                    key={a.id}
                    className="builder-card"
                    onClick={() => setSelection({ type: "agent", id: a.id })}
                  >
                    <AgentAvatar agent={a} />
                    <strong>{a.name}</strong>
                    <span className={`agent-status ${a.status}`}>
                      <span className={`agent-status-marker ${a.status}`} aria-hidden="true">
                        {AGENT_STATUS_GLYPH[a.status] ?? "•"}
                      </span>
                      {a.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="activity-panel">
              <div className="panel-heading">
                <h2>From the field</h2>
                <span>PERSISTED</span>
              </div>
              <div className="events">
                {world.events.slice(0, 3).map((e, i) => (
                  <p key={i}>
                    <span className="event-dot" />
                    {e}
                  </p>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="offline-panel">
          <h2>Start the local dashboard to coordinate builders</h2>
          <p>
            Shared tasks live in the local server’s database, so all clients see the same state.
          </p>
          <a className="primary" href="http://127.0.0.1:4318/">
            Open local dashboard
          </a>
        </div>
      )}

      <Sheet
        modal={false}
        disablePointerDismissal
        open={!!selection}
        onOpenChange={(open) => !open && setSelection(null)}
      >
        <SheetContent
          showOverlay={false}
          className="detail-sheet"
          style={{ width: "min(94vw,580px)", maxWidth: 580 }}
        >
          <SheetTitle className="drawer-title">
            {agent?.name || project?.name || "Shared project"}
          </SheetTitle>
          <SheetDescription>
            {agent
              ? "Builder context, ownership and handoffs"
              : "Tasks, decisions and completion evidence"}
          </SheetDescription>
          {project && (
            <KnowledgePanel
              onInspect={(taskId, label) => setViewFocus({ taskId, label })}
              onSaved={() => setViewFocus((v) => ({ ...v, revision: (v.revision || 0) + 1 }))}
              key={project.id}
              project={project}
              agentId={agent ? `demo:${agent.id}` : undefined}
              offline={!online}
              onRefresh={() => setRefresh((r) => r + 1)}
            />
          )}
        </SheetContent>
      </Sheet>

      <footer className="footer">
        <span>HARAMBEE · Pulling together.</span>
        <span>Demo adapter · Persistent state · Human acceptance</span>
      </footer>
    </main>
  );
}
