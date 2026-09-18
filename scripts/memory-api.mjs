import { reconcileObservations } from "./memory-seed.mjs";
export function memoryApi(store, demo, observe) {
  return async (req, res, url) => {
    if (!url.pathname.startsWith("/api/memory")) return false;
    const send = (status, value) => {
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(value));
    };
    try {
      const bearer = req.headers.authorization?.replace(/^Bearer /, "");
      const runtime = bearer ? store.authenticate(bearer) : null;
      if (bearer && !runtime) {
        send(403, { error: "Invalid runtime credential" });
        return true;
      }
      if (req.method === "GET") {
        if (url.pathname === "/api/memory/context") {
          const projectId = url.searchParams.get("projectId"),
            agentId = url.searchParams.get("agentId"),
            taskId = url.searchParams.get("taskId");
          if (runtime && (runtime.projectId !== projectId || runtime.id !== agentId)) {
            send(403, { error: "Context outside runtime scope" });
            return true;
          }
          send(200, store.getAgentContext(projectId, agentId, taskId));
        } else {
          let observations = null;
          try {
            observations = observe();
            reconcileObservations(store, observations);
          } catch {
            /* Existing memory remains readable if Codex is unavailable. */
          }
          const projects = runtime
            ? [store.get(runtime.projectId)]
            : store.list(url.searchParams.get("mode") || undefined);
          send(200, {
            projects,
            exchange: store.ideas(
              runtime
                ? store.get(runtime.projectId).mode
                : url.searchParams.get("mode") || undefined,
              runtime?.projectId,
            ),
            observations: runtime ? null : observations,
            demo: { running: demo.running, speed: demo.speed },
            synchronizedAt: new Date().toISOString(),
          });
        }
        return true;
      }
      if (req.method !== "POST") {
        send(405, { error: "Method not supported" });
        return true;
      }
      // Browser coordinator writes must be same-origin JSON. Runtime writes need a scoped token.
      if (!runtime && !req.headers.origin) {
        send(403, { error: "Coordinator updates require the local dashboard origin" });
        return true;
      }
      if (!req.headers["content-type"]?.startsWith("application/json")) {
        send(415, { error: "JSON required" });
        return true;
      }
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 512000) {
          send(413, { error: "Update too large" });
          return true;
        }
      }
      let value;
      try {
        value = JSON.parse(body);
      } catch {
        send(400, { error: "Invalid JSON" });
        return true;
      }
      if (url.pathname === "/api/memory/demo") {
        if (runtime) {
          send(403, { error: "Coordinator only" });
          return true;
        }
        if (typeof value.running === "boolean") demo.setRunning(value.running);
        if ([1, 2, 4].includes(value.speed)) demo.speed = value.speed;
        send(200, { running: demo.running, speed: demo.speed });
        return true;
      }
      if (url.pathname === "/api/memory/token") {
        if (runtime) {
          send(403, { error: "Coordinator only" });
          return true;
        }
        send(200, {
          token: store.issueCredential(value.projectId, value.agentId),
          agentId: value.agentId,
          projectId: value.projectId,
        });
        return true;
      }
      if (url.pathname === "/api/memory/command") {
        if (
          !value.projectId ||
          !value.operation ||
          !value.input ||
          typeof value.input !== "object"
        ) {
          send(400, { error: "Project, operation and input required" });
          return true;
        }
        const actor = runtime || { id: "local-user", role: "coordinator" };
        send(
          200,
          store.command(value.projectId, actor, value.operation, value.input, {
            revision: value.revision,
            key: value.key,
          }),
        );
        return true;
      }
      send(404, { error: "Unknown memory endpoint" });
      return true;
    } catch (error) {
      send(error.status || 500, {
        error: error.status ? error.message : "Coordination service unavailable",
      });
      return true;
    }
  };
}
