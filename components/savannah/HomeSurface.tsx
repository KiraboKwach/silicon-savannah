import { showcaseSnapshot } from "@/lib/showcase";
import { characterRoster } from "@/lib/simulation";
import BuilderCharacterLineup from "./BuilderCharacterLineup";
import { useEffect, useState } from "react";
import Dashboard from "./Dashboard";
import LiveDashboard from "./LiveDashboard";
import { api } from "@/lib/memory";
export default function HomeSurface() {
  const [privateShowcase] = useState(() =>
    typeof window !== "undefined" &&
    !["live", "demo"].includes(new URLSearchParams(window.location.search).get("mode") || "")
      ? showcaseSnapshot()
      : undefined,
  );
  const [mode, setMode] = useState<"live" | "demo">(
    new URLSearchParams(window.location.search).get("mode") === "demo" ? "demo" : "live",
  );
  useEffect(() => {
    if (privateShowcase) return;
    const context = (
      document as Document & {
        modelContext?: { registerTool: (tool: unknown, options: unknown) => unknown };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "get_project_memory",
            description:
              "Read authoritative local project/task memory. Observed Codex agents are not controlled by this tool.",
            inputSchema: {
              type: "object",
              properties: { mode: { type: "string", enum: ["live", "demo"] } },
              required: ["mode"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true },
            execute: (input: unknown) => {
              const mode = (input as { mode?: string })?.mode;
              if (mode !== "live" && mode !== "demo") throw Error("mode must be live or demo");
              return api("/api/memory?mode=" + mode);
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => controller.abort();
  }, []);
  if (
    process.env.NODE_ENV !== "production" &&
    new URLSearchParams(window.location.search).has("characters")
  )
    return (
      <main className="dashboard">
        <BuilderCharacterLineup agents={characterRoster()} />
      </main>
    );
  if (privateShowcase)
    return (
      <>
        <div className="demo-welcome">
          <strong>Welcome to Silicon Savannah</strong>
          <span>Click a building to meet its agent. Try the HQ and map controls.</span>
          <a href="?mode=demo">Try task simulation ↗</a>
        </div>
        <LiveDashboard presentation={privateShowcase} onDemo={() => {}} />
      </>
    );
  return mode === "live" ? (
    <LiveDashboard onDemo={() => setMode("demo")} />
  ) : (
    <>
      <div className="demo-return">
        <span>Shared demo · Synthetic execution, persistent tasks</span>
        <button onClick={() => setMode("live")}>Return to live projects ↗</button>
      </div>
      <Dashboard />
    </>
  );
}
