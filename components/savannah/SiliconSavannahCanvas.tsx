"use client";
import HqConsole from "./HqConsole";
import { acceptedTaskIds, newlyAccepted, activityCaption } from "@/lib/scene-activity";
import {
  useProjectInspection,
  type InspectionFocus,
  type Inspection,
} from "./useProjectInspection";
import { sceneObstacles, hubPosition, type Rect } from "@/lib/visual-navigation";
import type { MemoryProject } from "@/lib/memory";
import type { Position } from "@/lib/simulation";
import { useBuilderJourney } from "./useBuilderJourney";
import { builderSpecialties, builderPersonas } from "./builder-appearance";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { chooseStroller, strollPhase, STROLL_MS } from "@/lib/idle-stroll";
import { sceneTime } from "@/lib/scene-time";
import BuilderCharacter from "./BuilderCharacter";
import GatheringPlace from "./GatheringPlace";
import BuilderChat from "./BuilderChat";
import { suggestionSpeaker, socialChatLine, startedWorking } from "@/lib/social-chat";
import SavannahLife from "./SavannahLife";
import ProjectArchitecture from "./ProjectArchitecture";
import ExchangeRoutes, { recentExchange } from "./ExchangeRoutes";
import ProjectDropdown from "./ProjectDropdown";
import { motion, useReducedMotion } from "framer-motion";
import type { LiveSnapshot, LiveProject } from "@/lib/live";
import type { World, Agent } from "@/lib/simulation";
export function AgentAvatar({ agent, small = false }: { agent: Agent; small?: boolean }) {
  return (
    <span
      className={`avatar character-portrait ${small ? "avatar-small" : ""}`}
      style={{ borderColor: agent.color }}
    >
      <BuilderCharacter agent={agent} active={false} />
      <span style={{ background: agent.color }}>{agent.name[0]}</span>
    </span>
  );
}
export default function SiliconSavannahCanvas({
  world,
  running,
  onProject,
  onAgent,
  live,
  inspectionFocus = null,
  memories,
}: {
  world: World;
  running: boolean;
  live?: LiveSnapshot;
  inspectionFocus?: InspectionFocus;
  memories?: MemoryProject[];
  onProject: (id: string) => void;
  onAgent: (id: string) => void;
}) {
  const previous = useRef<Record<string, string>>({});
  const [notice, setNotice] = useState<{
    id: string;
    name: string;
    x: number;
    observer: string;
  } | null>(null);
  useEffect(() => {
    if (!live?.connected) {
      previous.current = {};
      setNotice(null);
      return;
    }
    const started = startedWorking(previous.current, live.projects);
    previous.current = Object.fromEntries(live.projects.map((p) => [p.id, p.status]));
    if (!running) {
      setNotice(null);
      return;
    }
    if (started) {
      const index = live.projects.findIndex((p) => p.id === started.id);
      const observer = live.projects.find((p) => p.id !== started.id && p.status === "idle");
      if (observer)
        setNotice({
          id: started.id,
          name: started.name,
          x: world.projects[index]?.position.x ?? 490,
          observer: observer.id,
        });
    }
  }, [live, running, world.projects]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 11000);
    return () => clearTimeout(timer);
  }, [notice]);
  const [conversationTurn, setConversationTurn] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setConversationTurn((t) => t + 2), 2000);
    return () => clearInterval(timer);
  }, []);
  const [scene, setScene] = useState(() => sceneTime());
  useEffect(() => {
    const update = () => setScene(sceneTime());
    const timer = setInterval(update, 15000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const reduce = useReducedMotion();
  const [sceneryPaused, setSceneryPaused] = useState(false);
  const viewStorageKey =
    live?.source === "Anonymous presentation fixtures"
      ? "savannah:presentation-view"
      : "savannah:desktop-view";
  const [savedView] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(viewStorageKey) ||
          (live?.source === "Anonymous presentation fixtures" ? '{"mode":"hq","zoom":1.15}' : "{}"),
      );
    } catch {
      return {};
    }
  });
  const [viewMode, setViewMode] = useState<string>(
    ["all", "hq", "attention", "custom"].includes(savedView.mode) ? savedView.mode : "all",
  );
  const [mapZoom, setMapZoom] = useState(Math.max(0.4, Math.min(1.8, Number(savedView.zoom) || 1)));
  const [locatedAgent, setLocatedAgent] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const mapViewport = useRef<HTMLDivElement>(null);
  const exchange = running ? recentExchange(live) : null;
  const visits = useRef<Record<string, number>>({});
  const nextStroll = useRef(Date.now() + 45000);
  const [stroll, setStroll] = useState<{ id: string; at: number; jolly: boolean } | null>(null);
  useEffect(() => {
    const now = Date.now();
    if (!running || reduce || sceneryPaused || !live?.connected || document.hidden) {
      setStroll(null);
      nextStroll.current = now + 45000;
      return;
    }
    if (stroll) {
      const p = live.projects.find((p) => p.id === stroll.id);
      if (p?.status !== "idle" || p.stale || now - stroll.at >= STROLL_MS) setStroll(null);
      return;
    }
    if (now < nextStroll.current || notice || exchange) return;
    const p = chooseStroller(live.projects, visits.current, now);
    nextStroll.current = now + 120000 + Math.random() * 120000;
    if (p) {
      visits.current[p.id] = now;
      setStroll({ id: p.id, at: now, jolly: Math.random() < 0.4 });
    }
  }, [conversationTurn, live, running, reduce, sceneryPaused, stroll, notice, exchange]);
  const positions = useRef(new Map<string, Position>());
  const [campusProject, setCampusProject] = useState<string | null>(null);
  const effectiveFocus = campusProject ? { projectId: campusProject } : inspectionFocus;
  const { inspection, arrival } = useProjectInspection(
    world,
    effectiveFocus,
    running,
    conversationTurn,
    positions.current,
  );
  const obstacles = sceneObstacles(world.projects);
  const activeStroll =
    running &&
    !reduce &&
    !sceneryPaused &&
    stroll &&
    live?.projects.some((p) => p.id === stroll.id && p.status === "idle" && !p.stale)
      ? stroll
      : null;
  const [hqOpen, setHqOpen] = useState(false);
  const [cameraProject, setCameraProject] = useState<string | null>(null);
  const overview = useRef({ zoom: 1, left: 0, top: 0 });
  useEffect(() => {
    if (!effectiveFocus?.projectId) return;
    if (!cameraProject)
      overview.current = {
        zoom: mapZoom,
        left: mapViewport.current?.scrollLeft || 0,
        top: mapViewport.current?.scrollTop || 0,
      };
    setViewMode("custom");
    setLocatedAgent(null);
    setCameraProject(effectiveFocus.projectId);
    setMapZoom(1.25);
  }, [effectiveFocus?.projectId]);
  useEffect(() => {
    const view = mapViewport.current,
      project = world.projects.find((p) => p.id === cameraProject);
    if (!view || !project) return;
    const frame = requestAnimationFrame(() => {
      const stage = view.querySelector<HTMLElement>(".map-stage");
      if (!stage) return;
      view.scrollTo({
        left: Math.max(
          0,
          (project.position.x / 1000) * stage.offsetWidth * mapZoom - view.clientWidth * 0.42,
        ),
        top: Math.max(
          0,
          ((project.position.y - 60) / 640) * stage.offsetHeight * mapZoom -
            view.clientHeight * 0.42,
        ),
        behavior: reduce ? "instant" : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [cameraProject, mapZoom, reduce]);
  function visitProject(id: string) {
    setViewMode("custom");
    setLocatedAgent(null);
    if (!cameraProject)
      overview.current = {
        zoom: mapZoom,
        left: mapViewport.current?.scrollLeft || 0,
        top: mapViewport.current?.scrollTop || 0,
      };
    setCameraProject(id);
    setMapZoom(1.25);
    onProject(id);
  }
  function returnToLandscape() {
    setCameraProject(null);
    setLocatedAgent(null);
    setViewMode("all");
  }
  function preset(mode: string) {
    setCameraProject(null);
    setLocatedAgent(null);
    setViewMode(mode);
  }
  function locateAgent(id: string) {
    mapViewport.current
      ?.closest(".map-panel")
      ?.scrollIntoView({ block: "start", behavior: reduce ? "instant" : "smooth" });
    setViewMode("custom");
    setCameraProject(null);
    setLocatedAgent(id);
    setMapZoom(1.15);
  }
  useEffect(() => {
    const view = mapViewport.current;
    if (!view) return;
    const resize = new ResizeObserver(() => {
      if (viewMode === "all" || viewMode === "attention")
        setMapZoom(
          Math.min(1.1, Math.max(0.4, Math.min(view.clientWidth / 1400, view.clientHeight / 896))),
        );
      else if (viewMode === "hq") setMapZoom(1.15);
    });
    resize.observe(view);
    return () => resize.disconnect();
  }, [viewMode, expanded]);
  useEffect(() => {
    const view = mapViewport.current;
    if (!view) return;
    const frame = requestAnimationFrame(() => {
      if (viewMode === "all" || viewMode === "attention") view.scrollTo({ left: 0, top: 0 });
      else if (viewMode === "hq" || locatedAgent) {
        const agent = world.agents.find((a) => a.id === locatedAgent);
        const point = agent
          ? positions.current.get(agent.id) || agent.position
          : { x: 490, y: 540 };
        view.scrollTo({
          left: Math.max(0, point.x * 1.4 * mapZoom - view.clientWidth / 2),
          top: Math.max(0, point.y * 1.4 * mapZoom - view.clientHeight * 0.6),
          behavior: reduce ? "instant" : "smooth",
        });
      } else if (!cameraProject && savedView.mode === "custom")
        view.scrollTo({ left: savedView.left || 0, top: savedView.top || 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [viewMode, mapZoom, locatedAgent]);
  function saveView() {
    try {
      localStorage.setItem(
        viewStorageKey,
        JSON.stringify({
          mode: viewMode,
          zoom: mapZoom,
          left: mapViewport.current?.scrollLeft || 0,
          top: mapViewport.current?.scrollTop || 0,
        }),
      );
    } catch {}
  }
  useEffect(() => {
    saveView();
  }, [viewMode, mapZoom]);
  const knownAccepted = useRef(new Map<string, Set<string>>());
  const [celebrations, setCelebrations] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!running) {
      knownAccepted.current.clear();
      setCelebrations({});
      return;
    }
    const now = Date.now(),
      next: Record<string, number> = {};
    for (const m of memories || live?.memory || []) {
      const ids = acceptedTaskIds(m);
      if (newlyAccepted(knownAccepted.current.get(m.id), ids)) next[m.id] = now + 6000;
      knownAccepted.current.set(m.id, ids);
    }
    if (Object.keys(next).length) setCelebrations((old) => ({ ...old, ...next }));
  }, [running, memories, live?.memory]);
  const suggestionId =
    running && !sceneryPaused && !notice && !exchange
      ? suggestionSpeaker(
          conversationTurn,
          world.agents
            .filter(
              (a, i) =>
                ["idle", "blocked", "waiting"].includes(a.status) &&
                !live?.projects[i]?.stale &&
                a.id !== inspection?.agentId &&
                live?.projects[i]?.id !== activeStroll?.id,
            )
            .map((a) => a.id),
        )
      : null;
  return (
    <section
      style={{ "--scene-zoom": mapZoom } as CSSProperties}
      className={`map-panel desktop-map view-${viewMode} ${cameraProject ? "camera-focused" : ""} ${sceneryPaused ? "scenery-paused" : ""} ${expanded ? "map-expanded" : ""} scene-${scene.phase} ${running ? "running" : ""}`}
      aria-label="Innovation map"
    >
      <div className="panel-heading">
        <h2>
          <span className="live-dot" /> The innovation landscape
        </h2>
        <div className="landscape-controls">
          <div className="view-presets" aria-label="Quick views">
            {[
              ["all", "All projects"],
              ["hq", "Agent HQ"],
              ["attention", "Needs attention"],
            ].map(([mode, label]) => (
              <button key={mode} aria-pressed={viewMode === mode} onClick={() => preset(mode)}>
                {label}
              </button>
            ))}
          </div>
          {cameraProject && (
            <button className="return-landscape" onClick={returnToLandscape}>
              ← Back to landscape
            </button>
          )}
          {live && (
            <button className="open-hq-table" onClick={() => setHqOpen(true)}>
              HQ command table
            </button>
          )}
          <div className="map-view-controls" aria-label="Landscape view">
            <button
              aria-label="Zoom out"
              disabled={mapZoom <= 0.4}
              onClick={() => {
                setViewMode("custom");
                setMapZoom((z) => Math.max(0.4, +(z - 0.2).toFixed(1)));
              }}
            >
              −
            </button>
            <button aria-label="Reset zoom" onClick={() => preset("all")}>
              {Math.round(mapZoom * 100)}%
            </button>
            <button
              aria-label="Zoom in"
              disabled={mapZoom >= 1.8}
              onClick={() => {
                setViewMode("custom");
                setMapZoom((z) => Math.min(1.8, +(z + 0.2).toFixed(1)));
              }}
            >
              +
            </button>
            <button aria-pressed={expanded} onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Close full view" : "Full view"}
            </button>
          </div>
          <span
            className="scene-clock"
            title="Africa/Nairobi · East Africa Time. Stylized lighting: dawn 06–07, day 07–18, sunset 18–19, night 19–06."
          >
            {scene.phase === "night" ? "☾" : scene.phase === "day" ? "☀" : "◒"} {scene.time} EAT ·{" "}
            {scene.label}
          </span>
          <button
            className="scenery-toggle"
            aria-pressed={!sceneryPaused && !reduce}
            onClick={() => setSceneryPaused((p) => !p)}
            disabled={!!reduce}
            title={
              reduce
                ? "Reduced motion is enabled in your system settings"
                : "Pause or resume the birds, breeze, and ambient scenery"
            }
          >
            {sceneryPaused || reduce ? "▷ Resume scenery" : "Ⅱ Pause scenery"}
          </button>
        </div>
      </div>
      <div className="map-scroll" ref={mapViewport} onScroll={saveView}>
        <div className="map-stage" style={{ zoom: mapZoom }}>
          <div className="landscape" />
          <div className="scene-command-heading">
            <span>SILICON SAVANNAH</span>
            <strong>Your ideas. Taking shape.</strong>
            <small>
              {running
                ? `${world.projects.length} projects · ${world.agents.filter((a) => a.status === "working").length} agents working`
                : "Disconnected · last observed state"}
            </small>
          </div>
          <SavannahLife paused={sceneryPaused || !!reduce} />
          <svg
            viewBox="0 0 1000 640"
            className="world-svg"
            role="group"
            aria-label="Project buildings"
          >
            <defs>
              <pattern
                id="grid"
                width="42"
                height="42"
                patternUnits="userSpaceOnUse"
                patternTransform="skewY(-25)"
              >
                <path d="M42 0H0V42" fill="none" stroke="#ced9b2" strokeOpacity=".06" />
              </pattern>
            </defs>
            <rect width="1000" height="640" fill="url(#grid)" />
            {world.projects.map((p, i) => (
              <path
                className={
                  running && live?.projects[i]?.status === "working" && !reduce && !sceneryPaused
                    ? "active-project-route"
                    : undefined
                }
                key={p.id}
                d={`M490 475 Q${p.position.x} 420 ${p.position.x} ${p.position.y}`}
                stroke={p.color}
                strokeOpacity=".3"
                strokeDasharray="4 9"
                fill="none"
                strokeWidth="1.5"
              />
            ))}
            <g transform="translate(-108 -180) scale(1.22)">
              <GatheringPlace
                onOpen={live ? () => setHqOpen(true) : undefined}
                projects={world.projects.map((p, i) => ({
                  name: p.name,
                  color: p.color,
                  working:
                    running &&
                    (live ? live.projects[i]?.status === "working" : p.status === "in progress"),
                }))}
              />
            </g>
            {world.projects.map((p, i) => (
              <g
                key={p.id}
                transform={`translate(${p.position.x} ${p.position.y})`}
                role="button"
                tabIndex={0}
                aria-label={`Inspect ${p.name}`}
                aria-pressed={effectiveFocus?.projectId === p.id}
                className="project-building-target"
                onClick={() => visitProject(p.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    visitProject(p.id);
                  }
                }}
              >
                <ProjectArchitecture
                  project={p}
                  memory={
                    (memories || live?.memory)?.find(
                      (m) => m.id === (live?.projects[i]?.id || p.id),
                    ) || memories?.[i]
                  }
                  selected={effectiveFocus?.projectId === p.id}
                  selectedTaskId={
                    effectiveFocus?.projectId === p.id ? inspectionFocus?.taskId : undefined
                  }
                  celebrating={
                    running && (celebrations[live?.projects[i]?.id || p.id] || 0) > Date.now()
                  }
                  variant={i}
                  active={
                    running &&
                    (live
                      ? live.projects[i].status === "working"
                      : world.agents.some(
                          (a) => a.currentProjectId === p.id && a.status === "working",
                        ))
                  }
                />
              </g>
            ))}
            {running && live && <ExchangeRoutes world={world} live={live} reduced={!!reduce} />}
          </svg>
          {world.projects.map((p, i) => (
            <ProjectDropdown
              onCampusChange={setCampusProject}
              key={live?.projects[i]?.id || p.id}
              project={p}
              index={i}
              live={live?.projects[i]}
              memory={live?.memory?.find((m) => m.id === live.projects[i].id)}
              observedAt={live?.observedAt}
              selected={effectiveFocus?.projectId === p.id}
              onOpen={() => visitProject(p.id)}
            />
          ))}
          {world.agents.map((a, i) => (
            <MapBuilder
              inspection={inspection?.agentId === a.id ? inspection : undefined}
              inspectionBuilding={
                inspection
                  ? world.projects.find((p) => p.id === inspection.projectId)?.position
                  : undefined
              }
              onJourney={arrival}
              obstacles={obstacles}
              positions={positions.current}
              giveWay={
                !!activeStroll &&
                a.status === "idle" &&
                live?.projects[i]?.id !== activeStroll.id &&
                (Date.now() - activeStroll.at < 3500 ||
                  Date.now() - activeStroll.at > STROLL_MS - 3500)
              }
              stroll={
                inspection?.agentId !== a.id &&
                activeStroll &&
                activeStroll.id === live?.projects[i]?.id
                  ? { phase: strollPhase(Date.now() - activeStroll.at), jolly: activeStroll.jolly }
                  : undefined
              }
              projectPosition={
                (world.projects.find((p) => p.id === a.currentProjectId) || world.projects[i])
                  ?.position
              }
              project={live?.projects[i]}
              key={live?.projects[i]?.id || a.id}
              attentionX={
                notice && a.status === "idle"
                  ? notice.x
                  : suggestionId && suggestionId !== a.id && a.status === "idle"
                    ? positions.current.get(suggestionId)?.x
                    : undefined
              }
              noticeText={
                notice && live?.projects[i]?.id === notice.observer && a.status === "idle"
                  ? `${notice.name} is getting started. Catch up when they’re back.`
                  : undefined
              }
              suppressChat={!!notice}
              showSuggestion={suggestionId === a.id}
              chatText={socialChatLine(
                live?.projects[i],
                live?.memory?.find((m) => m.id === live.projects[i]?.id),
                live?.projects[i % 2 === 0 ? i + 1 : i - 1],
                Math.floor(conversationTurn / 60),
              )}
              conversationTurn={conversationTurn}
              restIndex={i}
              resting={
                !!(
                  running &&
                  live &&
                  a.status === "idle" &&
                  live.projects[i]?.idleSince &&
                  Date.parse(live.observedAt) - live.projects[i].idleSince! >= 3600000
                )
              }
              social={
                (suggestionId !== null && a.id !== suggestionId && a.status === "idle") ||
                (a.status === "idle" &&
                  world.agents.some(
                    (peer, pi) =>
                      peer.id !== a.id &&
                      peer.status === "idle" &&
                      (!activeStroll || live?.projects[pi]?.id !== activeStroll.id) &&
                      Math.floor(pi / 2) === Math.floor(i / 2),
                  ))
              }
              exchangeLabel={
                exchange && live
                  ? exchange.from === live.projects[i]?.id
                    ? exchange.text
                    : exchange.to.includes(live.projects[i]?.id)
                      ? "New idea available in Shared ideas"
                      : undefined
                  : undefined
              }
              agent={a}
              running={running}
              live={!!live}
              reduced={!!reduce}
              onClick={() => onAgent(a.id)}
            />
          ))}
          <button
            className="hq-dispatch-action"
            title="Open the HQ table to draft a task or request a next-task review"
            onClick={() => setHqOpen(true)}
            disabled={!live}
          >
            <span>Open HQ command table ↗</span>
            <small>Choose an agent · draft your next task</small>
          </button>
          <div className="hub-caption">
            AGENT HQ SILICON SAVANAH <span>PROJECT BUILDERS · SHARED IDEAS</span>
          </div>
          <div className="compass">
            N<span>↑</span>
          </div>
        </div>
      </div>
      {inspection && (
        <div
          className="inspection-status"
          role="status"
          data-request-id={inspection.requestId}
          data-inspector={inspection.agentId || ""}
          data-phase={inspection.phase}
        >
          {inspection.agentId
            ? `${world.agents.find((a) => a.id === inspection.agentId)?.name} · ${inspection.phase === "navigate" ? "Coming over" : inspection.phase === "acknowledge" ? "On my way" : inspection.phase === "arrive" ? "Arriving" : "Viewing"} ${inspection.label} with you`
            : `Inspection queued · ${inspection.label} · waiting for this project’s agent to be available and its approach to be clear`}
          <small>Local visual inspection · no AI job started</small>
        </div>
      )}
      {live && (
        <div className="scene-activity-feed" aria-label="Recent project activity">
          {[...live.projects]
            .sort((a, b) => b.lastAt - a.lastAt)
            .slice(0, 4)
            .map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  visitProject(world.projects[live.projects.findIndex((x) => x.id === p.id)].id)
                }
              >
                <span className={"feed-symbol feed-" + (running ? p.status : "offline")}>
                  {!running
                    ? "○"
                    : p.status === "working"
                      ? "⚒"
                      : p.status === "blocked"
                        ? "!"
                        : "·"}
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <small>{activityCaption(p, running)}</small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
        </div>
      )}
      <HqConsole
        open={hqOpen}
        onClose={() => setHqOpen(false)}
        world={world}
        live={live}
        connected={running && live?.source !== "Anonymous presentation fixtures"}
      />
      <nav className="agent-dock" aria-label="Project agents">
        {world.agents.map((agent, i) => (
          <div className="agent-dock-card" key={agent.id}>
            <button
              className="agent-dock-locate"
              onClick={() => locateAgent(agent.id)}
              aria-label={`Locate ${agent.name}`}
            >
              <AgentAvatar agent={agent} small />
              <span>
                <strong>{agent.name}</strong>
                <small>{live?.projects[i]?.name || world.projects[i]?.name}</small>
                <em>{running ? agent.status : "disconnected"}</em>
              </span>
            </button>
            <button
              className="agent-dock-actions"
              onClick={() => onAgent(agent.id)}
              aria-label={`Actions for ${agent.name}`}
            >
              Actions ↗
            </button>
          </div>
        ))}
      </nav>
      {viewMode === "attention" && (
        <p className="attention-view-note">
          {!running
            ? "Disconnected — attention status unavailable."
            : live?.projects.some(
                  (p) =>
                    ["blocked", "unknown"].includes(p.status) || p.signal?.kind === "attention",
                )
              ? "Highlighted labels need attention. Select a project to inspect."
              : "No projects on this page currently need attention."}
        </p>
      )}
      <div className="map-footer">
        <span>
          <i className="key idle" />
          Idle
        </span>
        <span>
          <i className="key assigned" />
          Assigned
        </span>
        <span>
          <i className="key moving" />
          Moving
        </span>
        <span>
          <i className="key working" />
          Working
        </span>
        <span>
          <i className="key completed" />
          Completed
        </span>
        <small>WORKING · AVAILABLE · ON BREAK</small>
      </div>
    </section>
  );
}

function MapBuilder({
  inspection,
  inspectionBuilding,
  onJourney,
  obstacles,
  positions,
  agent,
  giveWay = false,
  running,
  reduced,
  onClick,
  exchangeLabel,
  social,
  resting = false,
  restIndex = 0,
  conversationTurn = 0,
  chatText,
  attentionX,
  noticeText,
  suppressChat,
  showSuggestion = false,
  project,
  stroll,
  projectPosition,
}: {
  inspection?: Inspection;
  inspectionBuilding?: Position;
  onJourney: (id: number, phase: string) => void;
  obstacles: Rect[];
  positions: Map<string, Position>;
  giveWay?: boolean;
  stroll?: { phase: "outbound" | "looking" | "returning" | null; jolly: boolean };
  projectPosition?: { x: number; y: number };
  project?: LiveProject;
  attentionX?: number;
  noticeText?: string;
  suppressChat?: boolean;
  showSuggestion?: boolean;
  chatText?: string;
  conversationTurn?: number;
  resting?: boolean;
  restIndex?: number;
  social?: boolean;
  exchangeLabel?: string;
  agent: Agent;
  running: boolean;
  live: boolean;
  reduced: boolean;
  onClick: () => void;
}) {
  const [travelling, setTravelling] = useState(false);

  const [menu, setMenu] = useState(false);
  const menuRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (!menuRoot.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);
  const taskCount = project?.plan.filter((t) => t.status !== "completed").length || 0;
  const buildMass = 1;
  const sleeping = false;
  const activity = running ? project?.signal?.kind || agent.status : "offline";
  const prior = useRef<{ status: string; test: string | null } | null>(null);
  const [event, setEvent] = useState<string | null>(null);
  const offset = [...agent.name].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const moodPulse = (conversationTurn + offset) % 90;
  const isScan =
    running &&
    activity === "idle" &&
    agent.status === "idle" &&
    moodPulse > 12 &&
    moodPulse <= 18 &&
    !noticeText &&
    !exchangeLabel &&
    !stroll;
  const isFidget =
    running &&
    agent.status === "idle" &&
    agent.status === "idle" &&
    moodPulse > 48 &&
    moodPulse <= 59 &&
    !noticeText &&
    !exchangeLabel &&
    !stroll;
  const isTired =
    running &&
    activity === "idle" &&
    project?.idleSince &&
    Date.now() - project.idleSince > 1000 * 60 * 80;
  const isBusy = running && agent.status === "working";

  const chatLean =
    attentionX !== undefined
      ? "right"
      : noticeText
        ? "left"
        : project?.status === "working"
          ? "center"
          : restIndex % 2
            ? "right"
            : "left";
  useEffect(() => {
    const next = {
      status: project?.status || agent.status,
      test: project?.signal?.testResult || null,
    };
    const old = prior.current;
    prior.current = next;
    if (!running) {
      setEvent(null);
      return;
    }
    if (!old) return;
    if (old.status === "working" && next.status === "idle")
      setEvent("Turn finished. Click to see the result.");
    else if (old.status !== "working" && next.status === "working")
      setEvent(
        "Working on: " +
          (project?.plan.find((p) => p.status === "in progress")?.title ||
            project?.stage ||
            "the next step"),
      );
    else if (next.test && next.test !== old.test) setEvent(next.test);
  }, [project, agent.status, running]);
  useEffect(() => {
    if (!event) return;
    const timer = setTimeout(() => setEvent(null), 3600);
    return () => clearTimeout(timer);
  }, [event]);
  const strolling = !!(
    !inspection &&
    running &&
    !reduced &&
    agent.status === "idle" &&
    stroll?.phase &&
    projectPosition
  );
  const atHub = ["idle", "blocked", "unknown", "offline", "waiting"].includes(agent.status);
  const spot = hubPosition(agent.id, restIndex);
  const visit = projectPosition ? { x: projectPosition.x - 119, y: projectPosition.y + 27 } : spot;
  const destination =
    inspection?.point ||
    (strolling && stroll?.phase !== "returning"
      ? visit
      : atHub
        ? giveWay
          ? { x: spot.x + (restIndex % 2 ? 8 : -8), y: spot.y + 5 }
          : spot
        : projectPosition
          ? { x: projectPosition.x - 119, y: projectPosition.y + 27 }
          : agent.position);
  const journey = useBuilderJourney(destination, reduced || !running, {
    requestId: inspection?.requestId,
    jog: !!inspection,
    obstacles,
    onPosition: (p) => positions.set(agent.id, p),
    occupied: () => [...positions].filter(([id]) => id !== agent.id).map(([, p]) => p),
  });
  useEffect(() => {
    positions.set(agent.id, journey.position);
    return () => {
      positions.delete(agent.id);
    };
  }, [agent.id, positions]);
  useEffect(() => {
    if (inspection && journey.requestId === inspection.requestId)
      onJourney(inspection.requestId, journey.phase);
  }, [journey.phase, journey.requestId, inspection?.requestId]);
  useEffect(() => setTravelling(journey.phase !== "settled"), [journey.phase]);
  const strollWalking = strolling && stroll?.phase !== "looking";
  const microState = sleeping
    ? "rest"
    : isFidget
      ? "fidget"
      : isScan
        ? "scan"
        : isTired
          ? "tired"
          : isBusy
            ? "focus"
            : resting
              ? "rest"
              : "idle";
  const displayAgent =
    journey.phase === "walking"
      ? { ...agent, status: "moving" as const }
      : travelling
        ? { ...agent, status: "waiting" as const }
        : !travelling && agent.status === "moving"
          ? { ...agent, status: "waiting" as const }
          : agent;
  const suggesting =
    running &&
    showSuggestion &&
    !inspection &&
    !travelling &&
    !strolling &&
    !giveWay &&
    !menu &&
    !suppressChat &&
    !event &&
    !exchangeLabel &&
    !noticeText;
  return (
    <motion.div
      ref={(node) => {
        menuRoot.current = node;
        journey.root.current = node;
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setMenu(false);
      }}
      style={{ zIndex: menu ? 35 : journey.depth, left: journey.left, top: journey.top }}
      data-inspection={inspection?.requestId}
      data-journey={journey.phase}
      initial={false}

      title={`${agent.name} · ${builderPersonas[agent.id as keyof typeof builderPersonas]?.persona || builderSpecialties[agent.id]} · ${project?.name || agent.type}${strolling ? " · Idle stroll (animation only)" : ""}: ${running ? project?.signal?.label || project?.stage || agent.status : "Disconnected"}. ${project?.plan.find((p) => p.status === "in progress")?.title || project?.summary || "Click for latest work and actions."}`}
      className={`map-agent ${menu ? "agent-selected" : ""} activity-${activity} ${exchangeLabel ? "headset-notification" : ""} ${displayAgent.status} ${!running ? "paused" : ""} ${resting && !travelling && !strolling ? "builder-resting" : ""} builder-behavior-${microState}`}
    >
      <button
        className="builder-select-target"
        onClick={() => setMenu((v) => !v)}
        aria-expanded={menu}
        aria-label={`${agent.name}, ${builderSpecialties[agent.id] || agent.type}, ${agent.status}${sleeping ? ", dozing after one hour idle; click to wake and open tasks" : agent.status === "idle" ? ", waiting for a task" : ""}`}
      />
      <span className="agent-identity-card" role="tooltip">
        <strong>{agent.name}</strong>
        <span>{builderPersonas[agent.id as keyof typeof builderPersonas]?.persona}</span>
        <small>{builderSpecialties[agent.id] || agent.type}</small>
        <span>{project?.name || "Agent HQ"}</span>
        <b>{running ? project?.signal?.label || agent.status : "Disconnected"}</b>
        <small>
          {project?.lastAt
            ? "Last observed " + new Date(project.lastAt).toLocaleTimeString()
            : "No recent project event"}
        </small>
        <small>{taskCount} recorded unfinished plan tasks</small>
        <small>
          {sleeping
            ? "Dozing · click to wake and open tasks"
            : strolling
              ? "Ambient stroll · no project work implied"
              : agent.status === "idle"
                ? "Available · ambient gestures only"
                : "Click for observed work and actions"}
        </small>
      </span>
      <span className="builder-runtime-status" aria-label={running ? agent.status : "Disconnected"}>
        {
          {
            idle: "◦",
            assigned: "◆",
            moving: "→",
            working: "⚒",
            completed: "✓",
            blocked: "!",
            unknown: "?",
            waiting: "…",
            offline: "○",
          }[running ? agent.status : "offline"]
        }
      </span>
      <span
        className="builder-pose"
        style={
          {
            transform: `scale(${restIndex === 4 ? 0.87 : restIndex < 2 ? 0.94 : 1}) scaleX(${journey.phase === "walking" ? journey.facing : inspectionBuilding && inspection ? (inspectionBuilding.x < journey.position.x ? -1 : 1) : attentionX !== undefined ? (attentionX < journey.position.x ? -1 : 1) : spot.x > 500 ? -1 : 1})`,
            "--character-facing":
              journey.phase === "walking"
                ? journey.facing
                : inspectionBuilding && inspection
                  ? inspectionBuilding.x < journey.position.x
                    ? -1
                    : 1
                  : spot.x > 500
                    ? -1
                    : 1,
          } as React.CSSProperties
        }
      >
        <BuilderCharacter
          inspection={
            inspection
              ? journey.phase === "preparing"
                ? "acknowledge"
                : journey.phase === "settled"
                  ? inspection.phase === "standby"
                    ? "standby"
                    : "inspect"
                  : undefined
              : undefined
          }
          distanceDriven
          jog={!!inspection}
          sleeping={sleeping && !travelling}
          preparing={journey.phase === "preparing" || journey.phase === "arriving"}
          buildMass={buildMass}
          signal={running ? project?.signal?.kind : undefined}
          jolly={strollWalking && stroll?.jolly}
          attention={running && (activity === "attention" || activity === "blocked")}
          investigating={activity === "reading" || (strolling && stroll?.phase === "looking")}
          agent={displayAgent}
          active={running}
          seated={
            !inspection &&
            resting &&
            (journey.phase === "settled" || journey.phase === "preparing") &&
            !strolling
          }
          noticing={!strolling && (attentionX !== undefined || giveWay)}
          social={
            !inspection &&
            !sleeping &&
            (social || suggesting) &&
            !travelling &&
            !strolling &&
            !giveWay
          }
          speaking={suggesting}
          state={microState}
          fidget={!sleeping && isFidget}
        />
      </span>
      {sleeping ? (
        <span className="builder-sleep-cue" aria-hidden="true">
          <i>z</i>
          <i>z</i>
          <i>Z</i>
        </span>
      ) : running && agent.status === "idle" && !travelling && !strolling ? (
        <span className="builder-waiting-cue">Ready for a task</span>
      ) : null}
      {running && event ? (
        <BuilderChat text={event} observed lean={chatLean} />
      ) : running && exchangeLabel ? (
        <BuilderChat message={exchangeLabel} lean={chatLean} />
      ) : running && !strolling && noticeText ? (
        <BuilderChat text={noticeText} reaction lean={chatLean} />
      ) : suggesting ? (
        <BuilderChat
          key={Math.floor(conversationTurn / 60)}
          text={chatText}
          suggestion
          lean={chatLean}
        />
      ) : null}
      {menu && (
        <div className="builder-quick-actions" role="group" aria-label={agent.name + " actions"}>
          <strong>{agent.name}</strong>
          <small>
            {project?.lastAt
              ? "Last event " + new Date(project.lastAt).toLocaleString()
              : "No observed event"}
          </small>
          <small>{taskCount} unfinished plan tasks</small>
          <button
            onClick={() => {
              setMenu(false);
              onClick();
            }}
          >
            Latest work & tasks
          </button>
          {project?.codexUrl && <a href={project.codexUrl}>Give task in Codex ↗</a>}
          <button
            onClick={() => {
              setMenu(false);
              onClick();
            }}
          >
            Open project details
          </button>
        </div>
      )}
    </motion.div>
  );
}
