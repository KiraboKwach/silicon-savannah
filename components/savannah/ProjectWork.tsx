import type { LiveProject } from "@/lib/live";
import type { MemoryProject } from "@/lib/memory";
import { workFocus } from "@/lib/work-focus";
export default function ProjectWork({
  project,
  memory,
  onInspect,
  selectedTaskId,
}: {
  project: LiveProject;
  memory?: MemoryProject;
  onInspect?: (id: string | undefined, label: string) => void;
  selectedTaskId?: string;
}) {
  const focus = workFocus(project, memory);
  return (
    <section id="builder-latest-work" tabIndex={-1} className="project-work">
      <span className="eyebrow">{focus.label}</span>
      <h3>{project.stage}</h3>
      <p>{focus.text}</p>
      {project.plan.length > 0 && (
        <div className="work-step-list">
          {project.plan.map((step) => (
            <button
              key={step.id}
              aria-pressed={selectedTaskId === step.id}
              onClick={() => onInspect?.(step.id, step.title)}
            >
              <i
                className={
                  step.status === "completed"
                    ? "step-done"
                    : step.status === "in progress"
                      ? "step-active"
                      : ""
                }
              />
              <span>
                {step.title}
                <small>
                  {step.status === "completed"
                    ? "Agent reports finished"
                    : step.status === "in progress"
                      ? "Working on this"
                      : "Upcoming"}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
      {project.signal?.testResult && <p className="test-result">{project.signal.testResult}</p>}
      {!!project.signal?.files.length && (
        <div className="observed-files">
          <strong>Files reported changed this turn</strong>
          {project.signal.files.map((file) => (
            <code key={file}>{file}</code>
          ))}
        </div>
      )}
      <small>
        Reported by the project’s Codex conversation. Open shared memory below to review evidence
        and confirm completed work.
      </small>
    </section>
  );
}
