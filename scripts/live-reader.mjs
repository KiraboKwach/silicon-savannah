import { redactText } from "./privacy.mjs";
import { workSignal } from "./work-signal.mjs";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
export function sessionActivity(sessions, now = Date.now()) {
  const recent = sessions
    .filter((s) => s.started_at * 1000 >= now - 30 * 86400000 && s.started_at * 1000 <= now)
    .sort((a, b) => a.started_at - b.started_at);
  const gaps = recent
    .slice(1)
    .flatMap((s, i) =>
      recent[i].completed_at && s.started_at >= recent[i].completed_at
        ? [(s.started_at - recent[i].completed_at) * 1000]
        : [],
    );
  return {
    sessions: recent.length,
    averageIdleMs: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
  };
}
const safeText = (text, max = 350) => redactText(text, max);
function label(item) {
  if (item.type === "commandExecution") return "Running a command";
  if (item.type === "fileChange") return "Editing project files";
  if (item.type === "webSearch") return "Researching the web";
  if (item.type === "mcpToolCall")
    return `Using ${String(item.tool || "a connected tool").replace(/_/g, " ")}`;
  if (item.type === "agentMessage")
    return item.phase === "final_answer" ? "Turn completed" : "Sharing a progress update";
  if (item.type === "plan") return "Updating the task plan";
  return null;
}
export function normalizeTurn(turn, items, now = Date.now()) {
  const steps = items
    .filter((x) => label(x.item))
    .map((x) => ({
      id: x.item.id || String(x.time),
      title: label(x.item),
      status:
        x.item.status === "inProgress"
          ? "in progress"
          : x.item.status === "failed"
            ? "blocked"
            : "completed",
      time: x.time,
    }))
    .slice(-10);
  const lastMessage = [...items].reverse().find((x) => x.item.type === "agentMessage");
  const plans = items.filter((x) => x.item.type === "plan" && Array.isArray(x.item.plan));
  const plan = plans.at(-1)?.item.plan || [];
  const lastAt = Math.max(
    0,
    ...items.map((i) => i.time || 0),
    (turn?.completed_at || turn?.started_at || 0) * 1000,
  );
  let status =
    turn?.status === "inProgress"
      ? "working"
      : turn?.status === "completed"
        ? "idle"
        : turn?.status === "failed" || turn?.status === "interrupted"
          ? "blocked"
          : "unknown";
  const stale = status === "working" && now - lastAt > 15 * 60 * 1000;
  if (stale) status = "unknown";
  const current =
    [...steps].reverse().find((x) => x.status === "in progress")?.title || steps.at(-1)?.title;
  return {
    signal: workSignal(turn, items, status),
    turnId: turn?.turn_id || null,
    idleSince: status === "idle" ? turn?.completed_at * 1000 || lastAt : null,
    status,
    stale,
    lastAt,
    turnStatus: turn?.status || "unknown",
    stage:
      status === "working"
        ? current || "Working on the next step"
        : status === "idle"
          ? "Ready for your next message"
          : status === "blocked"
            ? "Needs attention"
            : "No recent signal",
    summary: safeText(lastMessage?.item.text),
    steps,
    plan: plan.map((p, i) => ({
      id: "plan" + i,
      title: safeText(p.step || p.title, 160),
      status:
        p.status === "completed"
          ? "completed"
          : p.status === "in_progress"
            ? "in progress"
            : "not started",
    })),
    progress: plan.length
      ? Math.round((plan.filter((p) => p.status === "completed").length / plan.length) * 100)
      : null,
  };
}
export function readLegacy(file) {
  const stat = fs.statSync(file),
    size = Math.min(stat.size, 2 * 1024 * 1024),
    buf = Buffer.alloc(size),
    fd = fs.openSync(file, "r");
  try {
    fs.readSync(fd, buf, 0, size, stat.size - size);
  } finally {
    fs.closeSync(fd);
  }
  const records = buf
    .toString("utf8")
    .split("\n")
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
  let turn = null,
    items = [],
    sessions = [];
  for (const record of records) {
    const p = record.payload || {},
      time = Date.parse(record.timestamp) || 0;
    if (record.type === "event_msg" && p.type === "task_started") {
      turn = { turn_id: p.turn_id, status: "inProgress", started_at: time / 1000 };
      sessions.push(turn);
      items = [];
    }
    if (record.type === "event_msg" && p.type === "task_complete") {
      turn = {
        ...turn,
        turn_id: p.turn_id || turn?.turn_id,
        status: "completed",
        completed_at: time / 1000,
      };
      if (sessions.length) sessions[sessions.length - 1] = turn;
    }
    if (record.type === "event_msg" && p.type === "turn_aborted")
      turn = { ...turn, status: "interrupted", completed_at: time / 1000 };
    if (record.type === "event_msg" && p.type === "agent_message")
      items.push({ time, item: { type: "agentMessage", text: p.message, phase: p.phase } });
    if (record.type === "response_item" && ["function_call", "custom_tool_call"].includes(p.type)) {
      if (!turn) turn = { status: "inProgress", started_at: time / 1000 };
      items.push({
        time,
        item: { type: "mcpToolCall", id: p.call_id, tool: p.name, status: "inProgress" },
      });
      if (p.name === "update_plan") {
        try {
          const v = JSON.parse(p.arguments);
          items.push({ time, item: { type: "plan", plan: v.plan } });
        } catch {}
      }
    }
    if (
      record.type === "response_item" &&
      ["function_call_output", "custom_tool_call_output"].includes(p.type)
    ) {
      const existing = items.findLast((x) => x.item.id === p.call_id);
      if (existing) existing.item.status = "completed";
    }
  }
  return { turn, items, sessions };
}
export function snapshot(
  config,
  root = process.env.CODEX_HOME || path.join(os.homedir(), ".codex"),
) {
  const state = new DatabaseSync(path.join(root, "state_5.sqlite"), { readOnly: true });
  let history;
  try {
    history = new DatabaseSync(path.join(root, "thread_history_1.sqlite"), { readOnly: true });
  } catch {}
  try {
    const projects = config.map((p) => {
      p = { ...p, codexUrl: `codex://threads/${encodeURIComponent(p.id)}` };
      try {
        const row = state
          .prepare("SELECT id,rollout_path,history_mode FROM threads WHERE id=?")
          .get(p.id);
        if (!row)
          return {
            ...p,
            status: "unknown",
            stage: "Task not found",
            steps: [],
            plan: [],
            progress: null,
            lastAt: 0,
          };
        let data;
        if (row.history_mode !== "legacy" && history) {
          const turn = history
            .prepare(
              "SELECT turn_id,status,started_at,completed_at FROM thread_turns WHERE thread_id=? ORDER BY rollout_ordinal DESC LIMIT 1",
            )
            .get(p.id);
          const rows = turn
            ? history
                .prepare(
                  "SELECT item_json,created_at_ms FROM thread_items WHERE thread_id=? AND turn_id=? AND item_type NOT IN ('reasoning','userMessage') ORDER BY rollout_ordinal DESC LIMIT 60",
                )
                .all(p.id, turn.turn_id)
                .reverse()
            : [];
          data = {
            turn,
            sessions: history
              .prepare(
                "SELECT started_at,completed_at FROM thread_turns WHERE thread_id=? AND started_at>=? ORDER BY started_at LIMIT 2000",
              )
              .all(p.id, Math.floor(Date.now() / 1000) - 30 * 86400),
            items: rows.flatMap((r) => {
              try {
                return [{ time: r.created_at_ms, item: JSON.parse(r.item_json) }];
              } catch {
                return [];
              }
            }),
          };
        } else data = readLegacy(row.rollout_path);
        return {
          ...p,
          ...normalizeTurn(data.turn, data.items),
          activity: sessionActivity(data.sessions || []),
        };
      } catch {
        return {
          ...p,
          status: "unknown",
          stage: "Local history unavailable",
          steps: [],
          plan: [],
          progress: null,
          lastAt: 0,
        };
      }
    });
    return {
      connected: true,
      source: "Local Codex history",
      observedAt: new Date().toISOString(),
      projects,
    };
  } finally {
    state.close();
    history?.close();
  }
}
