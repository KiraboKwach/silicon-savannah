import { useEffect, useRef, useState } from "react";
import { useMotionValue } from "framer-motion";
import type { Position } from "@/lib/simulation";
import { distance, planRoute, type Rect } from "@/lib/visual-navigation";
import { subscribeSceneFrame } from "./scene-frame";
export type JourneyPhase = "settled" | "preparing" | "walking" | "arriving" | "blocked";
type Options = {
  requestId?: number;
  jog?: boolean;
  obstacles?: Rect[];
  onPosition?: (p: Position) => void;
  occupied?: () => Position[];
};
/** Existing journey controller: all retargets begin at the interpolated current position. */
export function useBuilderJourney(target: Position, reduced: boolean, options: Options = {}) {
  const targetRef = useRef(target);
  targetRef.current = target;
  const current = useRef({ ...target }),
    root = useRef<HTMLDivElement>(null),
    config = useRef(options);
  config.current = options;
  const left = useMotionValue(`${target.x / 10}%`),
    top = useMotionValue(`${target.y / 6.4}%`),
    depth = useMotionValue(3 + Math.floor(target.y / 80));
  const [requestId, setRequestId] = useState(options.requestId);
  const facingRef = useRef(1);
  const [phase, setPhase] = useState<JourneyPhase>("settled"),
    [facing, setFacing] = useState(1);
  const travel = useRef<{
    route: Position[];
    phase: JourneyPhase;
    elapsed: number;
    speed: number;
    distance: number;
    token: number;
  }>({ route: [], phase: "settled", elapsed: 0, speed: 0, distance: 0, token: 0 });
  const routeTo = (point: Position) =>
    planRoute(current.current, point, [
      ...(config.current.obstacles || []),
      ...(config.current.occupied?.() || []).map((p) => ({
        left: p.x - 16,
        right: p.x + 16,
        top: p.y - 14,
        bottom: p.y + 14,
      })),
    ]);
  const transition = (next: JourneyPhase) => {
    if (travel.current.phase !== next) {
      travel.current.phase = next;
      travel.current.elapsed = 0;
      setPhase(next);
    }
  };
  const update = (p: Position) => {
    current.current = p;
    left.set(`${p.x / 10}%`);
    top.set(`${p.y / 6.4}%`);
    depth.set(3 + Math.floor(p.y / 80));
    config.current.onPosition?.(p);
  };
  useEffect(() => {
    setRequestId(options.requestId);
    const route = routeTo(target);
    travel.current.token++;
    travel.current.speed = 0;
    if (!route) {
      travel.current.route = [];
      transition("blocked");
      return;
    }
    travel.current.route = route.points;
    if (reduced || route.length < 2) {
      update({ ...target });
      transition("settled");
      return;
    }
    transition("preparing");
  }, [target.x, target.y, reduced, options.requestId]);
  useEffect(
    () =>
      subscribeSceneFrame((_now, dt) => {
        const t = travel.current;
        t.elapsed += dt;
        if (t.phase === "blocked") {
          if (t.elapsed > 2) {
            t.elapsed = 0;
            const route = routeTo(targetRef.current);
            if (route) {
              t.route = route.points;
              transition("preparing");
            }
          }
          return;
        }
        if (t.phase === "preparing") {
          if (t.elapsed > 0.45) transition("walking");
          return;
        }
        if (t.phase === "arriving") {
          if (t.elapsed > 0.55) transition("settled");
          return;
        }
        if (t.phase !== "walking") return;
        const next = t.route[0];
        if (!next) {
          transition("arriving");
          return;
        }
        const d = distance(current.current, next),
          remaining = t.route.reduce(
            (sum, p, i) => sum + distance(i ? t.route[i - 1] : current.current, p),
            0,
          );
        const limit = config.current.jog ? 86 : 44,
          targetSpeed = Math.min(limit, Math.max(10, remaining * 2));
        t.speed = Math.min(targetSpeed, t.speed + dt * 150);
        const step = Math.min(d, t.speed * dt),
          p = {
            x: current.current.x + ((next.x - current.current.x) * step) / (d || 1),
            y: current.current.y + ((next.y - current.current.y) * step) / (d || 1),
          };
        if (
          config.current
            .occupied?.()
            .some(
              (other) =>
                distance(p, other) < 14 && distance(p, other) < distance(current.current, other),
            )
        ) {
          transition("blocked");
          return;
        }
        const direction =
          Math.abs(next.x - current.current.x) < 0.2
            ? facingRef.current
            : next.x < current.current.x
              ? -1
              : 1;
        if (direction !== facingRef.current) {
          facingRef.current = direction;
          setFacing(direction);
        }
        update(p);
        t.distance += step;
        const rig = root.current?.querySelector<SVGSVGElement>(".savannah-agent");
        if (rig) {
          const cycle = (t.distance / (config.current.jog ? 44 : 34)) * Math.PI * 2;
          rig.style.setProperty(
            "--gait-swing",
            `${Math.sin(cycle) * (config.current.jog ? 14 : 10)}deg`,
          );
          rig.style.setProperty("--gait-knee-near", `${Math.max(0, Math.cos(cycle)) * 18}deg`);
          rig.style.setProperty("--gait-knee-far", `${Math.max(0, -Math.cos(cycle)) * 18}deg`);
          rig.style.setProperty("--gait-torso", `${Math.sin(cycle) * 1.1}deg`);
          rig.setAttribute("data-distance-gait", "true");
        }
        if (d <= step + 0.01) {
          t.route.shift();
          if (!t.route.length) transition("arriving");
        }
      }),
    [],
  );
  return { position: current.current, requestId, phase, facing, left, top, depth, root };
}
