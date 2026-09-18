import type { AgentStatus } from "./simulation";
export type ObservedPose =
  | "reading"
  | "editing"
  | "testing"
  | "command"
  | "working"
  | "waiting"
  | "idle"
  | "unknown";
/** Presentation only: a recent signal cannot override a stopped or disconnected runtime. */
export function observedPose(status: AgentStatus, signal?: string): ObservedPose {
  if (status === "unknown" || status === "offline") return "unknown";
  if (status === "blocked" || status === "waiting" || signal === "attention") return "waiting";
  if (status !== "working") return "idle";
  if (signal === "reading" || signal === "editing" || signal === "testing" || signal === "command")
    return signal;
  return "working";
}
