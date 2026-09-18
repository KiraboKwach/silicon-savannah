import { motion } from "framer-motion";
import type { LiveSnapshot } from "@/lib/live";
import type { World } from "@/lib/simulation";
export function recentExchange(live?: LiveSnapshot) {
  if (!live) return null;
  const now = Date.parse(live.observedAt);
  return (
    (live.exchange || [])
      .flatMap((idea) => [
        {
          id: idea.id,
          from: idea.sourceProjectId,
          to: idea.recipients,
          at: idea.at,
          label: "Lesson shared",
          text: idea.title,
        },
        ...idea.replies.map((r) => ({
          id: r.id,
          from: r.projectId,
          to: [idea.sourceProjectId, ...idea.recipients].filter((id) => id !== r.projectId),
          at: r.at,
          label: "Reply shared",
          text: r.text,
        })),
      ])
      .filter((e) => now - Date.parse(e.at) >= 0 && now - Date.parse(e.at) < 20000)
      .sort((a, b) => b.at.localeCompare(a.at))[0] || null
  );
}
export default function ExchangeRoutes({
  world,
  live,
  reduced,
}: {
  world: World;
  live: LiveSnapshot;
  reduced: boolean;
}) {
  const exchange = recentExchange(live);
  if (!exchange) return null;
  const source = world.projects[live.projects.findIndex((p) => p.id === exchange.from)];
  if (!source) return null;
  return (
    <g className="exchange-routes">
      {exchange.to.map((id) => {
        const target = world.projects[live.projects.findIndex((p) => p.id === id)];
        if (!target) return null;
        const d = `M${source.position.x} ${source.position.y + 20} Q490 515 ${target.position.x} ${target.position.y + 20}`;
        return (
          <g key={exchange.id + id}>
            <motion.path
              d={d}
              fill="none"
              stroke="#f4d99f"
              strokeWidth="2.5"
              strokeDasharray="5 7"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduced ? 0 : 2 }}
            />
            {!reduced && (
              <circle r="4" fill="#fff0c0">
                <animateMotion dur="2s" repeatCount="1" path={d} fill="freeze" />
              </circle>
            )}
          </g>
        );
      })}
      <g transform="translate(490 485)">
        <rect x="-66" y="-12" width="132" height="24" rx="12" fill="#e8c58b" />
        <text textAnchor="middle" y="4" fill="#17352a" fontSize="11">
          {exchange.label}
        </text>
      </g>
    </g>
  );
}
