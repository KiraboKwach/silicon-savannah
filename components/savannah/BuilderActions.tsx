import type { LiveProject } from "@/lib/live";
export default function BuilderActions({
  project,
  connected,
}: {
  project: LiveProject;
  connected: boolean;
}) {
  const signal = project.signal;
  const jump = (id: string) => {
    const section = document.getElementById(id);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
    section?.focus({ preventScroll: true });
  };
  return (
    <section className="builder-actions">
      <div className="builder-action-links">
        {project.codexUrl && (
          <a className="primary" href={project.codexUrl}>
            Open Codex task ↗
          </a>
        )}
        <button onClick={() => jump("builder-latest-work")}>View latest work</button>
        <button disabled={!connected} onClick={() => jump("builder-give-task")}>
          Give a task
        </button>
      </div>
      <p>
        <strong>{connected ? signal?.label || project.stage : "Disconnected"}</strong>
      </p>
      {signal?.question && <p>{signal.question}</p>}
      {project.status === "blocked" && (
        <p>
          {project.summary || "This turn stopped or failed. Open Codex for the blocker details."}
        </p>
      )}
      <small>
        {connected ? "Observed project activity" : "Last known activity; reconnect for updates"}. A
        completed turn does not mean the whole project is finished.
      </small>
    </section>
  );
}
