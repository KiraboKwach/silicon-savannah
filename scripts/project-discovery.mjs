import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";
export function discoverProjects(
  config,
  root = process.env.CODEX_HOME || path.join(os.homedir(), ".codex"),
) {
  const db = new DatabaseSync(path.join(root, "state_5.sqlite"), { readOnly: true });
  try {
    const rows = db
      .prepare(
        "SELECT id,title,source,agent_path FROM threads WHERE archived=0 AND has_user_event=1 ORDER BY created_at,id",
      )
      .all();
    const discovered = rows
      .filter(
        (r) =>
          !String(r.source).includes("subagent") && (!r.agent_path || r.agent_path === "/root"),
      )
      .map((r) => ({
        id: r.id,
        name: (r.title || "Untitled Codex task").slice(0, 160),
        taskTitle: (r.title || "Untitled Codex task").slice(0, 250),
        discovered: true,
      }));
    const configured = new Set(config.map((p) => p.id));
    return [...config, ...discovered.filter((p) => !configured.has(p.id))];
  } finally {
    db.close();
  }
}
