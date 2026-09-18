import { useEffect, useRef, useState } from "react";
import type { World, Position } from "@/lib/simulation";
import { available, inspectionChoice } from "@/lib/visual-navigation";
export type InspectionFocus = {
  projectId: string;
  taskId?: string;
  label?: string;
  revision?: number;
} | null;
export type Inspection = {
  requestId: number;
  projectId: string;
  agentId?: string;
  point?: Position;
  phase: "queued" | "acknowledge" | "navigate" | "arrive" | "inspect" | "standby";
  label: string;
  taskId?: string;
};
export function useProjectInspection(
  world: World,
  focus: InspectionFocus,
  connected: boolean,
  tick: number,
  positions: Map<string, Position>,
) {
  const serial = useRef(0),
    current = useRef<Inspection | null>(null),
    [inspection, setInspection] = useState<Inspection | null>(null),
    settledAt = useRef(0);
  const publish = (next: Inspection | null) => {
    current.current = next;
    setInspection(next);
  };
  const signature = world.agents
    .map((a) => a.id + ":" + a.status + ":" + a.currentProjectId)
    .join("|");
  const projectSignature = world.projects
    .map((p) => p.id + ":" + p.position.x + ":" + p.position.y)
    .join("|");
  useEffect(() => {
    const project = world.projects.find((p) => p.id === focus?.projectId);
    if (!focus || !project) {
      if (current.current) {
        serial.current++;
        publish(null);
      }
      return;
    }
    let next = current.current;
    if (!next || next.projectId !== focus.projectId)
      next = {
        requestId: ++serial.current,
        projectId: focus.projectId,
        phase: "queued",
        label: focus.label || project.name,
        taskId: focus.taskId,
      };
    if (
      !connected ||
      (next.agentId &&
        !world.agents.some(
          (a) => a.id === next!.agentId && a.currentProjectId === next!.projectId && available(a),
        ))
    ) {
      next = {
        ...next,
        requestId: ++serial.current,
        agentId: undefined,
        point: undefined,
        phase: "queued",
      };
    }
    if (!next.agentId && connected) {
      const chosen = inspectionChoice(world.agents, project, world.projects, positions);
      if (chosen)
        next = {
          ...next,
          requestId: ++serial.current,
          agentId: chosen.agentId,
          point: chosen.point,
          phase: "acknowledge",
        };
    }
    if (
      next.label !== (focus.label || project.name) ||
      next.taskId !== focus.taskId ||
      focus.revision !== lastRevision.current
    ) {
      next = {
        ...next,
        label: focus.label || project.name,
        taskId: focus.taskId,
        phase: next.phase === "standby" ? "inspect" : next.phase,
      };
      settledAt.current = Date.now();
      lastRevision.current = focus.revision;
    }
    if (next.phase === "inspect" && Date.now() - settledAt.current > 5500)
      next = { ...next, phase: "standby" };
    if (JSON.stringify(next) !== JSON.stringify(current.current)) publish(next);
  }, [
    focus?.projectId,
    focus?.taskId,
    focus?.label,
    focus?.revision,
    connected,
    signature,
    projectSignature,
    tick,
  ]);
  const lastRevision = useRef<number | undefined>(undefined);
  function arrival(requestId: number, phase: string) {
    const active = current.current;
    if (!active || active.requestId !== requestId) return;
    const nextPhase =
      phase === "blocked"
        ? "queued"
        : phase === "preparing"
          ? "acknowledge"
          : phase === "walking"
            ? "navigate"
            : phase === "arriving"
              ? "arrive"
              : "inspect";
    if (nextPhase === "queued") {
      publish({
        ...active,
        requestId: ++serial.current,
        agentId: undefined,
        point: undefined,
        phase: "queued",
      });
      return;
    }
    if (nextPhase === "inspect") settledAt.current = Date.now();
    if (active.phase !== nextPhase) publish({ ...active, phase: nextPhase });
  }
  return { inspection, arrival };
}
