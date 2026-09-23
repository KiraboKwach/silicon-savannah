import type { MemoryProject } from "@/lib/memory";
import { constructionState, componentIndex } from "@/lib/construction-visuals";
import { useId } from "react";
import type { Project } from "@/lib/simulation";
/** Architecture identifies a project. Only the plinth meter reports reviewed progress. */
export default function ProjectArchitecture({
  project,
  variant,
  active,
  memory,
  selected = false,
  selectedTaskId,
  celebrating = false,
}: {
  project: Project;
  variant: number;
  active: boolean;
  celebrating?: boolean;
  memory?: MemoryProject;
  selected?: boolean;
  selectedTaskId?: string;
}) {
  const id = useId().replaceAll(":", ""),
    v = variant % 5;
  const blocks = [
    [
      [0, 0, 35, 49],
      [36, 15, 18, 22],
    ],
    [
      [-25, 0, 23, 56],
      [25, 10, 23, 45],
    ],
    [
      [-25, 0, 25, 24],
      [25, 8, 25, 32],
    ],
    [[0, 0, 51, 25]],
    [
      [-25, 0, 26, 29],
      [26, 8, 23, 41],
    ],
  ][v];
  const state = constructionState(project, memory);
  const selectedComponent = componentIndex(selectedTaskId, project, memory, blocks.length);
  return (
    <g
      data-architecture={
        [
          "financial-campus",
          "trading-towers",
          "travel-pavilion",
          "creative-studio",
          "innovation-lab",
        ][v]
      }
      className={`project-architecture ${active ? "architecture-active" : ""}`}
      data-construction={
        state.complete
          ? "complete"
          : !state.known
            ? "unknown"
            : state.blocked
              ? "blocked"
              : state.accepted.length
                ? "partial"
                : "foundation"
      }
      data-accepted={state.accepted.length}
    >
      <title>
        {`${project.name} · illustrated project campus · ${state.progress === null ? "Completion unknown" : `${state.progress}% accepted components`}`}
      </title>
      <defs>
        <linearGradient id={id + "roof"} x2="1" y2="1">
          <stop stopColor="#c9c3a4" />
          <stop offset="1" stopColor="#788f7b" />
        </linearGradient>
        <linearGradient id={id + "wall"}>
          <stop stopColor="#d0c4a6" />
          <stop offset=".55" stopColor="#a6ae99" />
          <stop offset="1" stopColor="#6e897d" />
        </linearGradient>
        <linearGradient id={id + "glass"} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#acd6cc" />
          <stop offset=".3" stopColor="#4d817e" />
          <stop offset=".55" stopColor="#244b52" />
          <stop offset="1" stopColor="#122f38" />
        </linearGradient>
        <linearGradient id={id + "plaza"} x2="0" y2="1">
          <stop stopColor="#849783" />
          <stop offset="1" stopColor="#425d52" />
        </linearGradient>
        <radialGradient id={id + "ground"}>
          <stop stopColor="#051813" stopOpacity=".6" />
          <stop offset="1" stopColor="#051813" stopOpacity="0" />
        </radialGradient>
      </defs>
      {selected && (
        <ellipse cy="12" rx="108" ry="49" fill="none" stroke="#f0cd8c" strokeWidth="2" />
      )}
      {active && (
        <g className="project-work-halo">
          <ellipse cy="12" rx="98" ry="37" fill={project.color} opacity=".1" />
          <ellipse
            cy="12"
            rx="96"
            ry="36"
            fill="none"
            stroke={project.color}
            strokeWidth="1.5"
            opacity=".65"
          />
        </g>
      )}
      <ellipse cx="12" cy="26" rx="108" ry="42" fill={`url(#${id}ground)`} />
      <path d="M-91 4Q-65-20 0-36Q61-22 91 4L91 13Q50 41 0 51Q-50 40-91 13Z" fill="#334d3d" />
      <path
        d="M-91 4Q-65-20 0-36Q61-22 91 4Q50 32 0 43Q-50 32-91 4Z"
        fill={`url(#${id}plaza)`}
        stroke="#a2ad84"
        strokeWidth=".6"
      />
      <g aria-hidden="true" className="campus-landscaping">
        <path
          d="M-84 14Q-45 37 0 46Q45 36 84 14"
          fill="none"
          stroke="#d5c09a"
          strokeWidth=".9"
          opacity=".65"
        />
        <path
          d="M-69 8-16 31 0 24 54 0"
          fill="none"
          stroke="#c2b496"
          strokeWidth="8"
          opacity=".65"
        />
        <path
          d="M-69 8-16 31 0 24 54 0"
          fill="none"
          stroke="#ede0c1"
          strokeWidth=".5"
          strokeDasharray="1 4"
        />
        {[-58, -32, 32, 58].map((x) => (
          <g key={x} transform={`translate(${x} ${33 - Math.abs(x) * 0.27})`}>
            <ellipse cy="3" rx="3" ry="1.4" fill="#172f29" opacity=".6" />
            <path d="M0 2v-5" stroke="#263f38" strokeWidth="1.4" />
            <path d="M-1.6-3h3.2" stroke="#f0d6a2" strokeWidth="1.3" />
          </g>
        ))}
      </g>
      <path
        d="M-76 6Q-28 32 0 32T78 6"
        fill="none"
        stroke="#c5bd99"
        strokeWidth="5"
        opacity=".65"
      />
      {blocks.map(([x, y, w, h], i) => {
        const tasks = state.tasks.filter((_, index) => index % blocks.length === i);
        const accepted = tasks.filter((t) => state.accepted.includes(t)).length;
        const ratio = tasks.length ? accepted / tasks.length : state.complete ? 1 : 0;
        return (
          <g
            key={i}
            transform={`translate(${x} ${y})`}
            data-component-index={i}
            data-component-tasks={tasks.map((t) => t.id).join(" ")}
            data-accepted-ratio={ratio}
          >
            <path
              d={`M${-w} 0 0 ${w * 0.42} ${w} 0 0 ${-w * 0.42}Z`}
              fill="#426356"
              stroke={project.color}
              strokeWidth="1"
            />
            <g className="campus-building-body">
              <path
                d={`M${-w} 0 0 ${w * 0.42} ${w} 0 0 ${-w * 0.42}Z`}
                fill="#1a392d"
                opacity=".6"
                transform="translate(5 5)"
              />
              <path
                d={`M${-w} ${-h} 0 ${-h + w * 0.42}V${w * 0.42}L${-w} 0Z`}
                fill={"url(#" + id + "wall)"}
              />
              <path d={`M0 ${-h + w * 0.42} ${w} ${-h}V0L0 ${w * 0.42}Z`} fill="#284a46" />
              <path
                d={`M${-w + 4} ${-h + 6} -4 ${-h + w * 0.42 + 4}V${w * 0.42 - 5}L${-w + 4} -5Z`}
                fill={`url(#${id}glass)`}
              />
              <path
                d={`M4 ${-h + w * 0.42 + 4} ${w - 4} ${-h + 6}V-5L4 ${w * 0.42 - 5}Z`}
                fill={`url(#${id}glass)`}
                opacity=".75"
              />
              {[0.25, 0.5, 0.75].map((t) => (
                <g key={t} aria-hidden="true">
                  <path
                    d={`M${-w + w * t} ${-h + w * t * 0.42 + 4}v${h - 8}M${w * t} ${-h + w * (1 - t) * 0.42 + 4}v${h - 8}`}
                    stroke="#c6c5a9"
                    strokeWidth="1.3"
                    opacity=".8"
                  />
                </g>
              ))}
              <path
                d={`M${-w + 6} ${-h + 9} -8 ${-h + w * 0.42 + 7}v6L${-w + 6} ${-h + 15}Z`}
                fill="#e5f3de"
                opacity=".18"
              />
              {[0.25, 0.55, 0.82].map((n) => (
                <g key={n}>
                  <path
                    d={`M${-w + 5} ${-h * n} 0 ${-h * n + w * 0.42 - 2}`}
                    className="building-window"
                    stroke="#b9b99f"
                    strokeWidth="1.8"
                  />
                  <path
                    d={`M4 ${-h * n + w * 0.42 - 2} ${w - 4} ${-h * n + 2}`}
                    stroke="#a1c7ae"
                    strokeWidth="2"
                    opacity=".65"
                  />
                </g>
              ))}
              <path
                d={`M${-w - 3} ${-h - 2} 0 ${-h - w * 0.42 - 2} ${w + 3} ${-h - 2} 0 ${-h + w * 0.42}Z`}
                fill={"url(#" + id + "roof)"}
                stroke="#d8ceb0"
                strokeWidth=".7"
              />
              {v === 2 ? (
                <path
                  d={`M${-w - 5} ${-h - 3} 0 ${-h - 20} ${w + 5} ${-h - 3}`}
                  fill="#a57350"
                  stroke="#d3b288"
                  strokeWidth="2"
                />
              ) : (
                <path
                  d={`M${-w * 0.6} ${-h - 3} 0 ${-h - w * 0.25 - 3} ${w * 0.6} ${-h - 3} 0 ${-h + w * 0.25 - 3}Z`}
                  fill="#315b58"
                  stroke="#8aaca0"
                  strokeWidth=".8"
                />
              )}
              <path d={`M${-w + 3} ${-h + 2}V-2`} stroke="#ede1b9" opacity=".45" />
              <path
                d={`M${-w - 1} -2 0 ${w * 0.42 - 2} ${w + 1} -2`}
                fill="none"
                stroke="#c8b391"
                strokeWidth="3"
              />
              <g className="campus-entry" aria-hidden="true">
                <path
                  d={`M-12 ${w * 0.42 - 8} 0 ${w * 0.42 - 3} 12 ${w * 0.42 - 8}v10L0 ${w * 0.42 + 7}-12 ${w * 0.42 + 2}Z`}
                  fill="#142f32"
                />
                <path
                  d={`M-17 ${w * 0.42 - 10} 0 ${w * 0.42 - 17} 17 ${w * 0.42 - 10} 0 ${w * 0.42 - 3}Z`}
                  fill="#d3b989"
                  stroke="#ead8ad"
                  strokeWidth=".65"
                />
                <path d={`M-14 ${w * 0.42 - 9}v12m28-12v12`} stroke="#ac9977" strokeWidth="1" />
                <path
                  d={`M-12 ${w * 0.42 + 4} 0 ${w * 0.42 + 9} 12 ${w * 0.42 + 4}`}
                  fill="none"
                  stroke="#bbc4ab"
                  strokeWidth="2"
                />
              </g>
            </g>
            {selected && selectedComponent === i && (
              <path
                className="component-inspection"
                d={`M${-w - 7} 3 0 ${w * 0.42 + 6} ${w + 7} 3 0 ${-w * 0.42 - 5}Z`}
              />
            )}
          </g>
        );
      })}
      {/* Permanent architectural identity; none of these details represents completion. */}
      <g className="architecture-signature" aria-hidden="true">
        {v === 0 && (
          <g>
            <path d="M-29-5 2-19 35-4 3 10Z" fill="#274c42" stroke="#b9be9c" />
            <path d="M-21-5 2-15 26-4 3 6Z" fill="#88bcb0" />
            <path d="M12-39 32-29 48-36v7L32-21 12-31Z" fill="#c5bc95" />
            <path d="M-43-6v-20m0 0 12-5v12l-12 5" stroke="#dcc28a" fill="#557d6b" />
          </g>
        )}
        {v === 1 && (
          <g>
            <path
              d="M-48-57-26-68-3-57M2-46 25-57 49-46"
              fill="none"
              stroke="#c7b47d"
              strokeWidth="2"
            />
            <path d="M-26-68v-13m51 24v-12" stroke="#dec789" />
            <path d="M-25-23 0-12 25-23v7L0-5-25-16Z" fill="#173d35" stroke="#9ac4b4" />
            <text x="0" y="-12" textAnchor="middle" fill="#dbc994" fontSize="4">
              MARKETS
            </text>
          </g>
        )}
        {v === 2 && (
          <g>
            <path d="M-57-25-26-52 5-25-26-12Z" fill="#a76448" stroke="#e2bc89" />
            <path d="M-5-26 25-56 57-26 25-12Z" fill="#bb8356" stroke="#e2bc89" />
            <path d="M-12 14Q1-5 16 12" fill="none" stroke="#ccb286" strokeWidth="4" />
            <path d="M-7 12h20" stroke="#617c67" strokeWidth="3" />
          </g>
        )}
        {v === 3 && (
          <g>
            <path d="M-43-27 0-46 43-27 0-9Z" fill="#b57c54" stroke="#e2c391" strokeWidth="3" />
            <path d="M-30-27 0-40 30-27 0-15Z" fill="#244d49" stroke="#91b8b0" strokeWidth="2" />
            <path d="M-17-27 0-34 17-27 0-20Z" fill="#c4a578" />
            <path d="M-35 0v-16l18 8V8Z" fill="#d2c7a4" />
            <path d="m-31-9 10 5v5l-10-5Z" fill="#789a88" />
          </g>
        )}
        {v === 4 && (
          <g>
            <path d="M-53-30Q-25-69 2-30L-25-17Z" fill="#528c80" stroke="#a1d1be" />
            <path
              d="M-53-30-25-47 2-30M-25-47v30M-39-39-38-24m26-15v15"
              fill="none"
              stroke="#b7d3b7"
              strokeWidth=".8"
            />
            <path d="M18-37 35-45 47-39 30-31Z" fill="#273f52" stroke="#a0c3c2" />
            <path d="M26-40 38-34m-3-8-9 9" stroke="#94bdbb" strokeWidth=".6" />
          </g>
        )}
      </g>
      {state.blocked && (
        <g
          className="building-blocker"
          transform="translate(76 -26)"
          aria-label="Project needs attention"
        >
          <path d="M0 10V-9" stroke="#e8b67b" />
          <circle cy="-13" r="7" fill="#d79b62" />
          <text y="-10" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#203c30">
            !
          </text>
        </g>
      )}
      {celebrating && (
        <g className="accepted-celebration" aria-label="New verified task accepted">
          <ellipse cy="10" rx="95" ry="42" stroke="#e5d49d" fill="none" strokeWidth="2" />
          {[-45, -22, 0, 22, 45].map((x, i) => (
            <path
              key={x}
              d={`M${x} -35v-8m-3 4h6`}
              stroke="#f4e4ae"
              style={{ animationDelay: i * 0.12 + "s" }}
            />
          ))}
          <text y="-82" textAnchor="middle" fill="#f3e3ad" fontSize="8">
            ✓ VERIFIED TASK ACCEPTED
          </text>
        </g>
      )}
      {[-73, 73].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i ? 9 : 0})`}>
          <ellipse cy="6" rx="12" ry="4" fill="#24432e" opacity=".4" />
          <path d="M0 5v-16" stroke="#6a6243" strokeWidth="2" />
          <ellipse cy="-13" rx="12" ry="7" fill="#48683e" />
          <ellipse cx="-3" cy="-16" rx="9" ry="5" fill="#81945c" />
        </g>
      ))}
      <path d="M-38 28 0 42 38 28" stroke="#284738" strokeWidth="3" fill="none" />
      {state.progress !== null && (
        <path
          d="M-38 28 0 42 38 28"
          stroke={project.color}
          pathLength="100"
          strokeDasharray={`${Math.max(0, Math.min(100, state.progress))} 100`}
          strokeWidth="3"
          fill="none"
        />
      )}
      {active && (
        <g
          transform="translate(65 -6)"
          className="site-crane"
          stroke="#d9ba80"
          fill="none"
          strokeWidth="1.3"
        >
          <path d="M-3 6v-71h6V6M-3-51 3-40-3-29 3-18-3-7M-25-65h47v5h-47ZM0-76-22-65M0-76 19-65" />
          <g className="crane-cable">
            <path d="M-19-60v27q0 4 4 1" />
          </g>
        </g>
      )}
      <g transform="translate(0 25)">
        <path d="M-20-3H20V7H-20Z" fill="#193a30" stroke="#aab992" strokeWidth=".5" />
        <text
          y="4"
          textAnchor="middle"
          fontSize="5"
          fontFamily="Arial,sans-serif"
          fill="#ecdfb9"
          letterSpacing=".6"
        >
          {project.name.toUpperCase().slice(0, 19)}
        </text>
      </g>
      <g transform="translate(-51 20)">
        <circle r="3" fill={project.color} />
        <circle r="6" stroke={project.color} opacity=".35" fill="none" />
      </g>
    </g>
  );
}
