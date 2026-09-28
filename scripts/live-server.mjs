import http from "node:http";
import { displayData, projectCatalog, forwardedRequest } from "./privacy.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { InitiativeRunner } from "./initiative-runner.mjs";
import { snapshot } from "./live-reader.mjs";
import { discoverProjects } from "./project-discovery.mjs";
import { MemoryStore } from "./memory-store.mjs";
import { seedMemory, reconcileObservations } from "./memory-seed.mjs";
import { DemoExecutor } from "./demo-executor.mjs";
import { memoryApi } from "./memory-api.mjs";
import { loadLocalConfig } from "./local-config.mjs";
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  port = Number(process.env.PORT || 4320),
  host = "127.0.0.1";
const settings = loadLocalConfig(base),
  config = settings.projects;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
const store = new MemoryStore(
  path.join(process.env.SAVANNAH_DATA_DIR || path.join(base, "data"), "coordination.sqlite"),
);
seedMemory(store, config, base);
const initiatives = new InitiativeRunner(
  store,
  process.env.SAVANNAH_DATA_DIR || path.join(base, "data"),
);
const demo = new DemoExecutor(store);
let discovered = config,
  lastDiscovery = 0;
function observe() {
  if (!settings.live)
    return {
      connected: false,
      source: "Local connection disabled",
      observedAt: new Date().toISOString(),
      projects: [],
    };
  if (Date.now() - lastDiscovery > 15000) {
    discovered = settings.discover ? discoverProjects(config) : config;
    lastDiscovery = Date.now();
  }
  return snapshot(discovered);
}
const handleMemory = memoryApi(store, demo, observe);

setInterval(() => {
  try {
    demo.step();
  } catch (error) {
    console.error("Demo executor paused:", error.message);
    demo.setRunning(false);
  }
}, 500).unref();
http
  .createServer(async (req, res) => {
    const allowed = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    if (!allowed.has(req.headers.host) || forwardedRequest(req.headers)) {
      res.writeHead(403).end();
      return;
    }
    const url = new URL(req.url, `http://${host}:${port}`);
    const requestOrigin = req.headers.origin;
    if (
      requestOrigin &&
      !new Set([
        `http://127.0.0.1:${port}`,
        `http://localhost:${port}`,
        "http://127.0.0.1:5174",
      ]).has(requestOrigin)
    ) {
      res.writeHead(403).end();
      return;
    }
    if (url.pathname === "/api/initiative" && !settings.live) {
      res
        .writeHead(403, { "Content-Type": "application/json" })
        .end(JSON.stringify({ error: "Enable SAVANNAH_LIVE to use local project reviews." }));
      return;
    }
    if (await initiatives.handle(req, res, url)) return;
    if (await handleMemory(req, res, url)) return;
    if (req.method !== "GET") {
      res.writeHead(405).end();
      return;
    }
    if (url.pathname === "/api/health") {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ app: "silicon-savannah", version: 2, edition: "community", memory: true }),
      );
      return;
    }
    if (url.pathname === "/api/live") {
      const origin = req.headers.origin;
      if (
        origin &&
        !new Set([
          `http://127.0.0.1:${port}`,
          `http://localhost:${port}`,
          "http://127.0.0.1:5174",
        ]).has(origin)
      ) {
        res.writeHead(403).end();
        return;
      }
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/json");
      try {
        const observed = observe();
        reconcileObservations(store, observed);
        observed.projects = observed.projects.map((p) => ({
          ...p,
          initiative: initiatives.records[p.id] || null,
          ...(initiatives.records[p.id]?.status === "running"
            ? {
                status: "working",
                signal: {
                  kind: "reading",
                  label: initiatives.records[p.id].stage,
                  files: [],
                  question: null,
                  testResult: null,
                },
                stage: initiatives.records[p.id].stage,
                summary: "A real read-only Codex review is running.",
              }
            : {}),
        }));
        const hidden = new Set(
          store
            .list("live")
            .filter((p) => p.hidden)
            .map((p) => p.id),
        );
        res.end(
          JSON.stringify({
            ...displayData(observed, hidden),
            catalog: projectCatalog(observed.projects, store.list("live")),
            memory: displayData(store.list("live"), hidden),
            exchange: displayData(store.ideas("live"), hidden),
          }),
        );
      } catch {
        res.writeHead(503).end(
          JSON.stringify({
            connected: false,
            error: "Local Codex history unavailable. Open Codex on this computer.",
          }),
        );
      }
      return;
    }
    const dist = path.join(base, "dist");
    let requested;
    try {
      requested = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    let file = path.resolve(dist, "." + requested);
    if (file !== dist && !file.startsWith(dist + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
      file = path.join(dist, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(503).end("Build the dashboard first with npm run build.");
      return;
    }
    res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, host, () => console.log(`Silicon Savannah live: http://${host}:${port}`));
