import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { api, type MemoryProject, type Briefing, type Check } from "@/lib/memory";
const show = (v: unknown) =>
  typeof v === "string"
    ? v
    : typeof v === "object" && v && "text" in v
      ? String(v.text)
      : JSON.stringify(v);
export default function KnowledgePanel({
  project: p,
  agentId,
  onRefresh,
  offline = false,
  onInspect,
  onSaved,
}: {
  project: MemoryProject;
  agentId?: string;
  onRefresh: () => void;
  offline?: boolean;
  onInspect?: (id: string | undefined, label: string) => void;
  onSaved?: () => void;
}) {
  const pending = useRef<{ signature: string; body: Record<string, unknown> } | null>(null);
  const [taskId, setTaskId] = useState(""),
    [briefing, setBriefing] = useState<Briefing | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState(""),
    [target, setTarget] = useState(""),
    [token, setToken] = useState("");
  const task =
    p.tasks.find((t) => t.id === taskId) || p.tasks.find((t) => t.owner === agentId) || p.tasks[0];
  const selectedAgent = agentId || task?.owner || target || p.agents[0]?.id;
  const run = p.runs.findLast(
    (r) => r.agentId === selectedAgent && (!task || r.taskId === task.id),
  );
  const [evidenceChecks, setEvidenceChecks] = useState<Record<string, Check["result"]>>({});
  useEffect(() => {
    setBriefing(null);
    setEvidenceChecks({});
  }, [task?.id]);
  async function change(operation: string, input: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const signature = JSON.stringify([p.id, operation, input]);
      if (pending.current?.signature !== signature)
        pending.current = {
          signature,
          body: {
            projectId: p.id,
            operation,
            input,
            revision: p.revision,
            key: crypto.randomUUID(),
          },
        };
      await api("/api/memory/command", pending.current.body);
      pending.current = null;
      onSaved?.();
      onRefresh();
      return true;
    } catch (e) {
      if (e && typeof e === "object" && "status" in e) pending.current = null;
      setError((e as Error).message);
      onRefresh();
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function refreshContext() {
    if (!task || !selectedAgent) return;
    setError("");
    try {
      setBriefing(
        await api<Briefing>(
          `/api/memory/context?projectId=${encodeURIComponent(p.id)}&agentId=${encodeURIComponent(selectedAgent)}&taskId=${encodeURIComponent(task.id)}`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section
      className="knowledge"
      onToggle={(e) => {
        const section = e.target as HTMLDetailsElement;
        if (section.open)
          onInspect?.(task?.id, section.querySelector("summary")?.textContent || "Project section");
      }}
    >
      <div className="memory-heading">
        <h3>Shared project memory</h3>
        <span>Revision {p.revision}</span>
      </div>
      <p className="memory-sync">
        Synced {new Date(p.updatedAt).toLocaleString()} ·{" "}
        {p.mode === "demo" ? "Demo adapter" : "Local coordination"}
      </p>
      {error && (
        <p role="alert" className="memory-error">
          {error}
        </p>
      )}
      {offline && <p className="memory-error">Disconnected. Edits and activity are paused.</p>}
      <p>
        <b>Objective</b>
        <br />
        {p.objective || "Unknown — add an objective before execution."}
      </p>
      <p>
        <b>Scope</b>
        <br />
        {p.scope || "Unknown"}
      </p>
      <div className="memory-counts">
        <span>{p.summary.completed} accepted</span>
        <span>{p.summary.active} active</span>
        <span>{p.summary.blocked} blocked</span>
        <span>{p.summary.review} in review</span>
        <strong>
          {p.summary.progress === null ? "No tasks" : p.summary.progress + "% accepted"}
        </strong>
      </div>
      <details>
        <summary>Project instructions and decisions</summary>
        {(
          [
            "requirements",
            "acceptanceCriteria",
            "constraints",
            "decisions",
            "notes",
            "questions",
          ] as const
        ).map((kind) => (
          <div key={kind}>
            <h4>{kind.replace("acceptanceCriteria", "Acceptance criteria")}</h4>
            {p[kind].length ? (
              p[kind].map((x, i) => (
                <p className="memory-note" key={i}>
                  {show(x)}
                </p>
              ))
            ) : (
              <p>Unknown / not recorded.</p>
            )}
          </div>
        ))}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            await change("update_project", {
              objective: f.get("objective"),
              scope: f.get("scope"),
            });
          }}
        >
          <label>
            Objective
            <Input name="objective" defaultValue={p.objective || ""} required />
          </label>
          <label>
            Scope
            <Input name="scope" defaultValue={p.scope || ""} required />
          </label>
          <button disabled={busy || offline} className="subtle">
            Save project instructions
          </button>
        </form>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            if (await change("add_note", { kind: f.get("kind"), text: f.get("text") }))
              form.reset();
          }}
        >
          <label>
            Record
            <NativeSelect name="kind">
              <NativeSelectOption value="decisions">Decision</NativeSelectOption>
              <NativeSelectOption value="constraints">Constraint</NativeSelectOption>
              <NativeSelectOption value="notes">Implementation note</NativeSelectOption>
              <NativeSelectOption value="questions">Open question</NativeSelectOption>
            </NativeSelect>
          </label>
          <Textarea name="text" required aria-label="Project note" />
          <button disabled={busy || offline} className="subtle">
            Add to memory
          </button>
        </form>
      </details>
      <h4>Work and ownership</h4>
      <div className="memory-task-list">
        {p.tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTaskId(t.id);
              onInspect?.(t.id, t.title);
            }}
            aria-pressed={task?.id === t.id}
          >
            <span>{t.title}</span>
            <small>
              {t.status.replaceAll("_", " ")} ·{" "}
              {p.agents.find((a) => a.id === t.owner)?.name || "Unassigned"} · {t.verification}
            </small>
          </button>
        ))}
        {!p.tasks.length && (
          <p>No tasks recorded. Existing Codex activity is still shown separately.</p>
        )}
      </div>
      <details>
        <summary>Add a task</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const f = new FormData(form);
            if (
              await change("create_task", {
                title: f.get("title"),
                acceptance: String(f.get("criteria")).split("\n").filter(Boolean),
                requiresApproval: true,
                dependencies: f.get("dependency") ? [f.get("dependency")] : [],
              })
            )
              form.reset();
          }}
        >
          <label>
            Task title
            <Input name="title" required />
          </label>
          <label>
            Acceptance criteria, one per line
            <Textarea name="criteria" required />
          </label>
          <label>
            Dependency
            <NativeSelect name="dependency">
              <NativeSelectOption value="">None</NativeSelectOption>
              {p.tasks.map((t) => (
                <NativeSelectOption key={t.id} value={t.id}>
                  {t.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          <button disabled={busy || offline} className="subtle">
            Create task
          </button>
        </form>
      </details>
      {task && (
        <div className="memory-selected">
          <h4>{task.title}</h4>
          <p>
            <span className={"status " + task.status}>{task.status.replaceAll("_", " ")}</span> ·{" "}
            {task.verification}
          </p>
          {task.blocker && <p className="memory-error">Blocked: {task.blocker}</p>}
          <p>{task.summary || "No work summary recorded."}</p>
          <p>
            <b>Dependencies:</b>{" "}
            {task.dependencies
              .map((id) => {
                const d = p.tasks.find((t) => t.id === id);
                return `${d?.title || id} (${d?.status || "unknown"})`;
              })
              .join(", ") || "None recorded"}
          </p>
          <p>
            <b>Next:</b> {task.nextAction || "Refresh context before acting."}
          </p>
          <label>
            Builder
            <NativeSelect value={target} onChange={(e) => setTarget(e.target.value)}>
              <NativeSelectOption value="">Choose a connected builder</NativeSelectOption>
              {p.agents
                .filter((a) => a.mode !== "observer")
                .map((a) => (
                  <NativeSelectOption key={a.id} value={a.id}>
                    {a.name} · {a.mode}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </label>
          {task.status === "not_started" && (
            <button
              className="subtle"
              disabled={busy || offline || !target}
              onClick={() => change("claim", { taskId: task.id, agentId: target })}
            >
              Assign exclusively
            </button>
          )}
          <label>
            Review / handoff / resolution note
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed, what remains, and the next action"
            />
          </label>
          <div className="memory-actions">
            {task.source !== "codex-observation" &&
              ["assigned", "in_progress", "blocked", "failed"].includes(task.status) && (
                <button
                  className="subtle"
                  disabled={busy || offline || !target || !note.trim()}
                  onClick={() =>
                    change("reassign", {
                      taskId: task.id,
                      agentId: target,
                      summary: note,
                      remaining: task.results.at(-1)?.remaining || note,
                      nextAction: note,
                    })
                  }
                >
                  Save handoff & reassign
                </button>
              )}
            {["blocked", "failed"].includes(task.status) && (
              <button
                className="subtle"
                disabled={busy || offline || !note.trim()}
                onClick={() => change("unblock", { taskId: task.id, reason: note })}
              >
                Record resolution
              </button>
            )}
            {task.status === "in_review" && (
              <button
                className="primary"
                disabled={busy || offline || !note.trim()}
                onClick={() => change("accept", { taskId: task.id, approved: true, note })}
              >
                Approve evidence & accept
              </button>
            )}
            {!["completed", "cancelled"].includes(task.status) && (
              <button
                className="subtle"
                disabled={busy || offline || !note.trim()}
                onClick={() => change("cancel", { taskId: task.id, reason: note })}
              >
                Cancel with note
              </button>
            )}
          </div>
          <details>
            <summary>Acceptance checks and evidence</summary>
            <p>
              Acceptance checks must be recorded as actually run. The server rejects missing or
              failed checks.
            </p>
            {task.acceptance.map((c) => (
              <p key={c}>• {c}</p>
            ))}
            {!["completed", "in_progress"].includes(task.status) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void change("configure_acceptance", {
                    taskId: task.id,
                    acceptance: String(f.get("criteria")).split("\n").filter(Boolean),
                    requiresApproval: true,
                  });
                }}
              >
                <Textarea
                  name="criteria"
                  defaultValue={task.acceptance.join("\n")}
                  aria-label="Configured acceptance criteria"
                  required
                />
                <button className="subtle" disabled={busy || offline}>
                  Set required checks
                </button>
              </form>
            )}
            {task.status === "in_review" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void change("record_review_evidence", {
                    taskId: task.id,
                    summary: f.get("summary"),
                    checks: task.acceptance.map((name) => ({
                      name,
                      result: evidenceChecks[name] || "not_run",
                    })),
                    artifacts: [{ ref: f.get("ref"), label: f.get("label") }],
                  });
                }}
              >
                {task.acceptance.map((c) => (
                  <label key={c}>
                    {c}
                    <NativeSelect
                      value={evidenceChecks[c] || "not_run"}
                      onChange={(e) =>
                        setEvidenceChecks((s) => ({ ...s, [c]: e.target.value as Check["result"] }))
                      }
                    >
                      <NativeSelectOption value="not_run">Not run</NativeSelectOption>
                      <NativeSelectOption value="passed">Passed</NativeSelectOption>
                      <NativeSelectOption value="failed">Failed</NativeSelectOption>
                    </NativeSelect>
                  </label>
                ))}
                <label>
                  Evidence summary
                  <Textarea name="summary" required />
                </label>
                <label>
                  Artifact label
                  <Input name="label" required />
                </label>
                <label>
                  File / commit / test result reference
                  <Input name="ref" required />
                </label>
                <button className="subtle" disabled={busy || offline}>
                  Record actual evidence
                </button>
              </form>
            )}
            {task.results.map((r) => (
              <div className="memory-note" key={r.id}>
                <b>
                  {r.outcome} · {new Date(r.time).toLocaleString()}
                </b>
                <p>Attempted: {r.attempted}</p>
                <p>Changed: {r.changed}</p>
                <p>Remaining: {r.remaining}</p>
                {r.reason && <p>Reason: {r.reason}</p>}
                {r.checks.map((c, i) => (
                  <p key={i}>
                    {c.name}: <b>{c.result}</b>
                  </p>
                ))}
                {r.artifacts.map((a, i) => (
                  <p key={i}>
                    {a.label}: <code>{a.ref}</code>
                  </p>
                ))}
              </div>
            ))}
          </details>
          <details open={!!agentId}>
            <summary>Current briefing</summary>
            <p>
              {run
                ? `Context actually supplied to ${run.adapter} execution at ${new Date(run.contextSuppliedAt).toLocaleString()} · revision ${run.context.revision}.`
                : "No execution has received context. Displaying this briefing is a preview only."}
            </p>
            <button className="subtle" disabled={offline} onClick={refreshContext}>
              Refresh briefing preview
            </button>
            {(briefing || run?.context) && (
              <div className="briefing">
                <p>Preview / supplied revision: {(briefing || run?.context)?.revision}</p>
                <p>{(briefing || run?.context)?.objective}</p>
                <p>
                  <b>Next action:</b> {(briefing || run?.context)?.recommendedNextAction}
                </p>
                <h4>Dependencies</h4>
                {(briefing || run?.context)?.dependencies.map((d) => (
                  <p key={d.id}>
                    {d.title}: {d.status}
                  </p>
                ))}
                <h4>Related owned work</h4>
                {(briefing || run?.context)?.relatedWork.map((d) => (
                  <p key={d.id}>
                    {d.title}: {d.owner} · {d.status}
                  </p>
                ))}
                <h4>Ideas from other projects</h4>
                {(briefing || run?.context)?.crossProjectIdeas?.map((idea) => (
                  <div key={idea.id} className="memory-note">
                    <b>
                      {idea.sourceProjectName}: {idea.title}
                    </b>
                    <p>{idea.text}</p>
                    <small>{idea.verification} · assess relevance before reuse</small>
                  </div>
                ))}
                <p>{(briefing || run?.context)?.dataBoundary}</p>
              </div>
            )}
            {task.handoffs.map((h, i) => (
              <div className="memory-note" key={i}>
                <b>
                  Handoff · {h.from} → {h.to || "Next builder"}
                </b>
                <p>{h.summary}</p>
                <p>Remaining: {h.remaining}</p>
                <p>Next: {h.nextAction}</p>
              </div>
            ))}
          </details>
        </div>
      )}
      <details>
        <summary>Artifacts and chronological activity</summary>
        {p.artifacts.map((a, i) => (
          <p key={a.id || i}>
            {a.label} · {a.verification || "reported"}
            <br />
            <code>{a.ref}</code>
          </p>
        ))}
        {p.events.map((e) => (
          <div className="memory-event" key={e.id}>
            <time>{new Date(e.time).toLocaleString()}</time>
            <b>{e.type.replaceAll("_", " ")}</b>
            <small>
              {e.actor}
              {e.taskId ? " · " + (p.tasks.find((t) => t.id === e.taskId)?.title || e.taskId) : ""}
            </small>
            <p>{typeof e.details === "string" ? e.details : JSON.stringify(e.details)}</p>
          </div>
        ))}
      </details>
      {p.mode === "live" && (
        <details>
          <summary>Connect an executable runtime</summary>
          <p>
            The watched Codex agent is an observer. Register a runtime only when it implements the
            context → start → result protocol in the README.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await change("register_agent", { agentId: f.get("id"), name: f.get("name") });
            }}
          >
            <label>
              Runtime agent ID
              <Input name="id" required />
            </label>
            <label>
              Name
              <Input name="name" required />
            </label>
            <button className="subtle" disabled={busy || offline}>
              Register runtime
            </button>
          </form>
          {p.agents
            .filter((a) => a.mode === "runtime")
            .map((a) => (
              <button
                key={a.id}
                className="subtle"
                disabled={offline}
                onClick={async () => {
                  try {
                    const r = await api<{ token: string }>("/api/memory/token", {
                      projectId: p.id,
                      agentId: a.id,
                    });
                    setToken(r.token);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Generate scoped credential for {a.name}
              </button>
            ))}
          {token && (
            <label>
              Runtime token (keep private)
              <Input value={token} readOnly type="password" onFocus={(e) => e.target.select()} />
            </label>
          )}
        </details>
      )}
    </section>
  );
}
