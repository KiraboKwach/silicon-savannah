import type { LiveProject } from "./live";
import type { MemoryProject } from "./memory";
// Intermittent, staggered pairwise chat windows (roughly every 80-125s per pair).
export function socialChatVisible(seconds: number, index: number) {
  const pairSeed = index * 17;
  const offset = Math.abs(pairSeed) % 27;
  const cadence = 90 + ((pairSeed * 3 + index * 7) % 36); // 90-125s windows with a bit of drift.
  const phase = (seconds + offset) % cadence;
  const role = index % 2;
  const pair = Math.floor(seconds / cadence) % 3;

  if (Math.floor(index / 2) !== pair) return false;

  // Different timing for each agent role, with quiet intervals between phrases.
  return role === 0 ? phase >= 18 && phase < 34 : phase >= 50 && phase < 63;
}
/** One shared speaking slot, with a long quiet interval and no per-agent scheduler. */
export function suggestionSpeaker(seconds: number, eligible: string[]) {
  const phase = seconds % 60;
  return eligible.length && phase >= 12 && phase < 22
    ? eligible[Math.floor(seconds / 60) % eligible.length]
    : null;
}
const excerpt = (text: string, limit = 88) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > limit ? clean.slice(0, limit - 1) + "…" : clean;
};
export function socialChatLine(
  project?: LiveProject,
  memory?: MemoryProject,
  _partner?: LiveProject,
  index = 0,
) {
  if (!project) return "Could we agree on one small, testable next step?";
  const candidates: string[] = [];
  const tasks = (memory?.tasks || []).filter((t) => !["completed", "cancelled"].includes(t.status));
  const blocked = tasks.find((t) => t.blocker || ["blocked", "failed"].includes(t.status));
  if (blocked)
    candidates.push(
      project.name +
        ": could we resolve “" +
        excerpt(blocked.blocker || blocked.title) +
        "” first?",
    );
  else if (project.status === "blocked")
    candidates.push(
      project.name +
        ": could we review the interrupted work and agree on what is needed to continue?",
    );
  const next = tasks.find((t) => t.nextAction);
  if (next)
    candidates.push(project.name + ": next step to consider — " + excerpt(next.nextAction!));
  const review = tasks.find((t) => t.status === "in_review");
  if (review)
    candidates.push(
      project.name +
        ": could we check the evidence for “" +
        excerpt(review.title) +
        "” before accepting it?",
    );
  const step =
    project.plan.find((t) => t.status === "in progress") ||
    project.plan.find((t) => t.status !== "completed");
  if (step)
    candidates.push(
      project.name + ": could we break “" + excerpt(step.title) + "” into one testable step?",
    );
  const pending = tasks.find((t) => t.status === "not_started" || t.status === "assigned");
  if (pending)
    candidates.push(
      project.name +
        ": shall we clarify the acceptance checks for “" +
        excerpt(pending.title) +
        "”?",
    );
  if (!candidates.length)
    candidates.push(
      project.name + ": could we review the latest result together and choose the next priority?",
    );
  return candidates[Math.abs(index) % candidates.length];
}

// Only witnessed transitions trigger reactions, never initial loading or paging.
export function startedWorking(previous: Record<string, string>, projects: LiveProject[]) {
  return projects.find((p) => previous[p.id] === "idle" && p.status === "working" && !p.stale);
}
