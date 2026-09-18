import type { LiveSnapshot } from "./live";
/** Deliberately independent of live files, IDs, messages and deployment links. */
export function showcaseSnapshot(): LiveSnapshot {
  const now = Date.now();
  return {
    connected: true,
    source: "Anonymous presentation fixtures",
    observedAt: new Date(now).toISOString(),
    projects: ["Project 01", "Project 02", "Project 03", "Project 04", "Project 05"].map(
      (name, i) => ({
        id: `showcase-${i}`,
        name,
        taskTitle: [
          "Interface experience",
          "Platform architecture",
          "Quality checks",
          "Design exploration",
          "Service integration",
        ][i],
        status: "idle",
        stage: "Ready for the next task",
        summary: "Sample project context for the presentation. No live project content is loaded.",
        lastAt: now - (i + 1) * 60000,
        idleSince: now - (i + 1) * 60000,
        progress: null,
        steps: [],
        plan: [],
        signal: { kind: "idle", label: "Available", files: [], question: null, testResult: null },
      }),
    ),
  };
}
