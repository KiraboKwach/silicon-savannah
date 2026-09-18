const clean = (value, max = 200) =>
  typeof value === "string"
    ? value.replace(/(?:sk-|art_v2_)[A-Za-z0-9_-]+/g, "[redacted]").slice(0, max)
    : "";
export function workSignal(turn, items, status) {
  const result = {
    kind:
      status === "working"
        ? "working"
        : status === "idle"
          ? "idle"
          : status === "blocked"
            ? "blocked"
            : "unknown",
    label:
      status === "working"
        ? "Working"
        : status === "idle"
          ? "Available"
          : status === "blocked"
            ? "Needs attention"
            : "No recent signal",
    files: [],
    question: null,
    testResult: null,
  };
  for (const { item } of items) {
    if (item.type === "fileChange" && Array.isArray(item.changes))
      result.files.push(...item.changes.map((c) => clean(c.path)).filter(Boolean));
  }
  result.files = [...new Set(result.files)].slice(-8);
  const events = items.filter(({ item }) =>
    ["commandExecution", "fileChange", "webSearch", "mcpToolCall", "userInput"].includes(item.type),
  );
  const latest = events.at(-1)?.item;
  const testCommand = (i) =>
    i.type === "commandExecution" &&
    typeof i.command === "string" &&
    /^(?:(?:npm|pnpm|yarn) (?:run )?test(?:\s|$)|(?:npx )?(?:vitest|jest|pytest)(?:\s|$)|python(?:3)? -m pytest(?:\s|$)|node --test(?:\s|$))/.test(
      i.command.trim(),
    );
  const lastTest = events
    .map((e) => e.item)
    .filter(testCommand)
    .at(-1);
  if (lastTest && ["completed", "failed"].includes(lastTest.status))
    result.testResult =
      lastTest.exitCode === 0
        ? "Test command exited successfully"
        : lastTest.exitCode != null
          ? "Test command exited with code " + lastTest.exitCode
          : "Test command finished; outcome unavailable";
  if (status !== "working") return result;
  if (!latest || !["inProgress", "in_progress"].includes(latest.status)) return result;
  if (latest.type === "userInput" || /request_user_input/.test(latest.tool || "")) {
    result.kind = "attention";
    result.label = "Needs your answer";
    result.question =
      clean(latest.questions?.[0]?.question || latest.questions?.[0]?.title) ||
      "Open the Codex task to see the pending question.";
  } else if (latest.type === "fileChange") {
    result.kind = "editing";
    result.label = "Editing files";
  } else if (testCommand(latest)) {
    result.kind = "testing";
    result.label = "Running tests";
  } else if (
    latest.type === "webSearch" ||
    latest.commandActions?.some((a) => ["read", "search", "listFiles"].includes(a.type))
  ) {
    result.kind = "reading";
    result.label = "Investigating";
  } else if (latest.type === "commandExecution") {
    result.kind = "command";
    result.label = "Running a command";
  }
  return result;
}
