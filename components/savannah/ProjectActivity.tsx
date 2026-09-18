import type { LiveProject } from "@/lib/live";
import { duration, activityLabel } from "@/lib/activity";
import { ArrowUpRight, Clock } from "lucide-react";
export default function ProjectActivity({
  project,
  now,
  connected,
}: {
  project: LiveProject;
  now: number;
  connected: boolean;
}) {
  return (
    <section className="project-activity-card">
      <div className="activity-card-heading">
        <Clock size={16} />
        <span>PROJECT ACTIVITY</span>
      </div>
      <strong className="idle-duration">
        {connected ? activityLabel(project, now) : "Connection unavailable"}
      </strong>
      <p>
        {project.lastAt
          ? `Last activity ${new Date(project.lastAt).toLocaleString()}`
          : "No activity timestamp available"}
      </p>
      {project.activity && (
        <div className="activity-metrics">
          <div>
            <strong>{project.activity.sessions}</strong>
            <span>Work sessions · 30 days</span>
          </div>
          <div>
            <strong>
              {project.activity.averageIdleMs === null
                ? "—"
                : duration(project.activity.averageIdleMs)}
            </strong>
            <span>Average gap between sessions</span>
          </div>
        </div>
      )}
      <small>
        Idle time starts when the latest turn finishes. Gaps describe the available history of this
        Codex task.
      </small>
      {project.codexUrl && (
        <a className="codex-task-link" href={project.codexUrl}>
          Open project conversation in Codex <ArrowUpRight size={16} />
        </a>
      )}
      <div className="project-public-links">
        <h4>Websites & deployments</h4>
        {project.publicLinks?.length ? (
          project.publicLinks
            .filter((link) => {
              try {
                const u = new URL(link.url);
                return u.protocol === "https:" && !u.username && !u.password;
              } catch {
                return false;
              }
            })
            .map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                <span>
                  <strong>{link.label}</strong>
                  <small>{link.description}</small>
                  <em>{new URL(link.url).hostname}</em>
                </span>
                <ArrowUpRight size={18} />
              </a>
            ))
        ) : (
          <p>No public website recorded for this project yet.</p>
        )}
      </div>
    </section>
  );
}
