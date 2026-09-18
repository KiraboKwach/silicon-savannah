"use client";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import type { World, Task } from "@/lib/simulation";
import { AgentAvatar } from "./SiliconSavannahCanvas";
export function TaskPanel({
  task: t,
  world,
  onAssign,
  onUnblock,
}: {
  task: Task;
  world: World;
  onAssign: (agent: string, task: string) => void;
  onUnblock: (id: string) => void;
}) {
  const available = world.agents.filter((a) => ["idle", "completed"].includes(a.status));
  const owner = world.agents.find((a) => a.id === t.assignedAgentId);
  return (
    <div className="task-card">
      <div className="task-top">
        <strong>{t.title}</strong>
        <span className={`status ${t.status.replaceAll(" ", "-")}`}>{t.status}</span>
      </div>
      <p>{t.description}</p>
      <Progress value={t.progress} aria-label={`${t.title} progress`} />
      <div className="task-bottom">
        <span>
          {t.progress}%{owner ? ` · ${owner.name}` : ""}
        </span>
        {t.status === "not started" && (
          <button
            className="subtle"
            disabled={!available.length}
            onClick={() => onAssign(available[0].id, t.id)}
          >
            {available.length ? `Assign ${available[0].name}` : "No free builders"}
          </button>
        )}
        {t.status === "blocked" && (
          <button className="subtle" onClick={() => onUnblock(t.id)}>
            Resolve demo blocker
          </button>
        )}
      </div>
      {t.status === "blocked" && (
        <p className="block-note">
          Waiting for test environment access. Resolve to put this task back in the queue.
        </p>
      )}
    </div>
  );
}
export default function Details({
  selection,
  world,
  onClose,
  onAssign,
  onUnblock,
}: {
  selection: { type: "project" | "agent"; id: string } | null;
  world: World;
  onClose: () => void;
  onAssign: (agent: string, task: string) => void;
  onUnblock: (id: string) => void;
}) {
  const project =
    selection?.type === "project" ? world.projects.find((p) => p.id === selection.id) : undefined;
  const agent =
    selection?.type === "agent" ? world.agents.find((a) => a.id === selection.id) : undefined;
  const currentProject = world.projects.find((p) => p.id === agent?.currentProjectId),
    task = currentProject?.tasks.find((t) => t.id === agent?.currentTaskId);
  return (
    <Sheet
      open={!!selection}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="detail-sheet" style={{ width: "min(92vw,480px)", maxWidth: 480 }}>
        <div className="drawer-head">
          <p className="eyebrow">{project ? "PROJECT BRIEF" : "MEET YOUR BUILDER"}</p>
          <SheetTitle className="drawer-title">
            {project?.name || agent?.name || "Details"}
          </SheetTitle>
          <SheetDescription>
            {project?.description || agent?.type || "Select a project or agent."}
          </SheetDescription>
        </div>
        {project && (
          <>
            <div className="drawer-progress">
              <span>Overall completion</span>
              <strong>{project.progress}%</strong>
              <Progress value={project.progress} />
            </div>
            <div className="assigned-list">
              <span>{project.assignedAgents.length} active builders</span>
              {world.agents
                .filter((a) => project.assignedAgents.includes(a.id))
                .map((a) => (
                  <span key={a.id} className="mini-agent">
                    <AgentAvatar agent={a} small />
                    {a.name}
                  </span>
                ))}
            </div>
            <h3 className="section-label">TASKS · {project.tasks.length}</h3>
            {project.tasks.map((t) => (
              <TaskPanel
                key={t.id}
                task={t}
                world={world}
                onAssign={onAssign}
                onUnblock={onUnblock}
              />
            ))}
          </>
        )}
        {agent && (
          <>
            <div className="agent-profile">
              <AgentAvatar agent={agent} />
              <span className={`status ${agent.status}`}>{agent.status}</span>
            </div>
            <dl className="agent-facts">
              <dt>Role</dt>
              <dd>{agent.type}</dd>
              <dt>Current project</dt>
              <dd>{currentProject?.name || "Coordination hub"}</dd>
              <dt>Current task</dt>
              <dd>{task?.title || "Ready for assignment"}</dd>
            </dl>
            {["idle", "completed"].includes(agent.status) && (
              <>
                <h3 className="section-label">ASSIGN A TASK</h3>
                {world.projects.flatMap((p) =>
                  p.tasks
                    .filter((t) => t.status === "not started")
                    .map((t) => (
                      <button
                        key={t.id}
                        className="assignment"
                        onClick={() => onAssign(agent.id, t.id)}
                      >
                        <span>{p.name}</span>
                        <strong>{t.title}</strong>
                        <b>↗</b>
                      </button>
                    )),
                )}
                {!world.projects.some((p) => p.tasks.some((t) => t.status === "not started")) && (
                  <p>No open tasks. All available work is assigned or completed.</p>
                )}
              </>
            )}
            <p className="cultural-note">
              A fictional Maasai-inspired builder in contemporary workwear and patterned cloth.
              Names and roles identify demo agents.
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
