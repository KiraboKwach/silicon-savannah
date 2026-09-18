import type { MemoryProject } from "@/lib/memory";
export default function ProgressMeaning({ project }: { project?: MemoryProject }) {
  const summary = project?.summary;
  const percent = summary?.progress;
  return (
    <section className="progress-meaning">
      <div>
        <span className="eyebrow">REVIEWED WORK</span>
        <h3>
          {summary
            ? percent === null
              ? "No tracked tasks yet"
              : summary.completed === 0
                ? "Not reviewed yet"
                : `${summary.completed} of ${summary.total} tasks reviewed complete`
            : "Your apps can be live before their work is reviewed here"}
        </h3>
      </div>
      <p>
        {summary
          ? `${summary.review} awaiting review · ${summary.active} active · ${summary.blocked} blocked.`
          : "“Not reviewed yet” means no tracked tasks have been approved in this dashboard. It does not mean nothing has been built."}
      </p>
      {summary?.completed === 0 && (
        <p>
          Your website may already be working. Its recorded tasks still need evidence and approval
          here before the review count increases.
        </p>
      )}
      <details>
        <summary>
          How the building progress is calculated{percent != null ? ` · ${percent}% reviewed` : ""}
        </summary>
        <p>
          Reviewed and approved tasks ÷ all tracked tasks. For example, 3 approved out of 12 = 25%.
          Tasks count equally; cancelled tasks are excluded.
        </p>
        <div className="building-stages" aria-label="Building stages">
          {[
            "0% · Plan",
            "25% · 1 floor",
            "50% · 2 floors",
            "75% · 3 floors",
            "100% · 4 floors",
          ].map((label, i) => (
            <span
              key={label}
              className={percent != null && Math.floor(percent / 25) === i ? "current" : ""}
            >
              {label}
            </span>
          ))}
        </div>
        <small>
          Ghost floors show unconfirmed work. Each solid floor represents a 25% review milestone.
          This does not estimate whole-product readiness. Adding tasks can lower the percentage.
        </small>
      </details>
    </section>
  );
}
