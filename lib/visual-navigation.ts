import type { Agent, Position, Project } from "./simulation";
export type Rect = { left: number; right: number; top: number; bottom: number };
export type Route = { points: Position[]; length: number };
export const FOOT_OFFSET = 32;
export const distance = (a: Position, b: Position) => Math.hypot(a.x - b.x, a.y - b.y);
export function hubPosition(id: string, index: number): Position {
  return id === "a7"
    ? { x: 688, y: 476 }
    : [
        { x: 350, y: 435 },
        { x: 425, y: 480 },
        { x: 550, y: 502 },
        { x: 650, y: 435 },
        { x: 500, y: 410 },
      ][index % 5];
}
/** A local viewing gesture can include agents awaiting input; it never resumes their work. */
export function available(agent: Agent) {
  return ["idle", "completed", "blocked", "waiting"].includes(agent.status);
}
export function sceneObstacles(projects: Project[]): Rect[] {
  return [
    ...projects.map((p) => ({
      left: p.position.x - 101,
      right: p.position.x + 101,
      top: p.position.y - 42 - FOOT_OFFSET,
      bottom: p.position.y + 45 - FOOT_OFFSET,
    })),
    { left: 433, right: 547, top: 449 - FOOT_OFFSET, bottom: 511 - FOOT_OFFSET },
    { left: 570, right: 641, top: 478 - FOOT_OFFSET, bottom: 520 - FOOT_OFFSET },
  ];
}
const inside = (p: Position, r: Rect) =>
  p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;
export function segmentClear(a: Position, b: Position, obstacles: Rect[]) {
  return obstacles.every((r) => {
    if (inside(a, r)) return !inside(b, r);
    let lo = 0,
      hi = 1;
    for (const [v, d, min, max] of [
      [a.x, b.x - a.x, r.left, r.right],
      [a.y, b.y - a.y, r.top, r.bottom],
    ]) {
      if (Math.abs(d) < 1e-9) {
        if (v <= min || v >= max) return true;
        continue;
      }
      let t0 = (min - v) / d,
        t1 = (max - v) / d;
      if (t0 > t1) [t0, t1] = [t1, t0];
      lo = Math.max(lo, t0);
      hi = Math.min(hi, t1);
      if (lo >= hi) return true;
    }
    return hi <= 0 || lo >= 1;
  });
}
/** Small visibility graph over the existing world coordinates, not pointer coordinates. */
export function planRoute(from: Position, to: Position, obstacles: Rect[]): Route | null {
  if (obstacles.some((r) => inside(to, r))) return null;
  if (distance(from, to) < 1) return { points: [to], length: 0 };
  const corners = obstacles
    .flatMap((r) => [
      { x: r.left - 2, y: r.top - 2 },
      { x: r.right + 2, y: r.top - 2 },
      { x: r.left - 2, y: r.bottom + 2 },
      { x: r.right + 2, y: r.bottom + 2 },
    ])
    .filter(
      (p) => p.x > 12 && p.x < 988 && p.y > 25 && p.y < 600 && !obstacles.some((r) => inside(p, r)),
    );
  const nodes = [from, to, ...corners],
    cost = nodes.map(() => Infinity),
    prev = nodes.map(() => -1),
    done = new Set<number>();
  cost[0] = 0;
  for (let n = 0; n < nodes.length; n++) {
    let u = -1;
    for (let i = 0; i < nodes.length; i++) if (!done.has(i) && (u < 0 || cost[i] < cost[u])) u = i;
    if (u < 0 || !Number.isFinite(cost[u])) break;
    if (u === 1) break;
    done.add(u);
    for (let v = 1; v < nodes.length; v++) {
      if (done.has(v) || !segmentClear(nodes[u], nodes[v], obstacles)) continue;
      const next = cost[u] + distance(nodes[u], nodes[v]);
      if (next < cost[v]) {
        cost[v] = next;
        prev[v] = u;
      }
    }
  }
  if (!Number.isFinite(cost[1])) return null;
  const points: Position[] = [];
  for (let i = 1; i !== 0; i = prev[i]) {
    if (i < 0) return null;
    points.unshift(nodes[i]);
  }
  return { points, length: cost[1] };
}
export function inspectionChoice(
  agents: Agent[],
  project: Project,
  projects: Project[],
  positions: Map<string, Position>,
) {
  const candidates = agents
    .filter((agent) => available(agent) && agent.currentProjectId === project.id)
    .flatMap((agent) => {
      const index = agents.indexOf(agent),
        from = positions.get(agent.id) || hubPosition(agent.id, index);
      const occupied = agents
        .filter((a) => a.id !== agent.id)
        .map((a) => {
          const p =
            positions.get(a.id) ||
            (["working", "moving", "assigned"].includes(a.status)
              ? a.position
              : hubPosition(a.id, agents.indexOf(a)));
          return { left: p.x - 15, right: p.x + 15, top: p.y - 12, bottom: p.y + 12 };
        });
      const obstacles = [...sceneObstacles(projects), ...occupied];
      const points = [
        { x: project.position.x - 119, y: project.position.y + 27 },
        { x: project.position.x + 119, y: project.position.y + 27 },
        { x: project.position.x - 48, y: project.position.y + 68 },
        { x: project.position.x + 48, y: project.position.y + 68 },
      ];
      const choices = points
        .filter((p) => p.x > 20 && p.x < 980 && p.y < 594)
        .map((point) => ({ point, route: planRoute(from, point, obstacles) }))
        .filter((v): v is { point: Position; route: Route } => !!v.route)
        .sort((a, b) => a.route.length - b.route.length);
      if (!choices.length) return [];
      return [
        { agentId: agent.id, associated: agent.currentProjectId === project.id, ...choices[0] },
      ];
    })
    .sort((a, b) => Number(b.associated) - Number(a.associated) || a.route.length - b.route.length);
  return candidates[0] || null;
}
