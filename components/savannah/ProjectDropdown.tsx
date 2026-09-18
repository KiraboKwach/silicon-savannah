import ProductCampus from "./ProductCampus";
import { useEffect, useId, useRef, useState } from "react";
import type { Project } from "@/lib/simulation";
import type { LiveProject } from "@/lib/live";
import type { MemoryProject } from "@/lib/memory";
import { activityLabel } from "@/lib/activity";
import { workFocus } from "@/lib/work-focus";
export default function ProjectDropdown({
  project,
  live,
  memory,
  observedAt,
  onOpen,
  onCampusChange,
  selected = false,
}: {
  project: Project;
  index: number;
  live?: LiveProject;
  memory?: MemoryProject;
  observedAt?: string;
  onOpen: () => void;
  onCampusChange: (projectId: string | null) => void;
  selected?: boolean;
}) {
  const campus = (live?.publicLinks?.length || 0) > 1;
  const focus = live ? workFocus(live, memory) : null;
  const [open, setOpen] = useState(false),
    root = useRef<HTMLDivElement>(null),
    panelId = useId();
  useEffect(() => {
    if (campus) onCampusChange(open ? project.id : null);
  }, [campus, open, project.id, onCampusChange]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  return (
    <div
      ref={root}
      data-selected={selected}
      className={`project-dropdown project-hover ${open ? "hover-open" : ""} project-state-${live?.status || "unknown"} ${live?.signal?.kind === "attention" ? "needs-attention" : ""} ${campus ? "campus-project" : ""} ${project.position.y > 350 ? "dropdown-up" : ""}`}
      style={{ left: `${project.position.x / 10}%`, top: `${(project.position.y + 40) / 6.4}%` }}
      onPointerEnter={(e) => {
        if (!campus && (e.pointerType === "mouse" || e.pointerType === "pen")) setOpen(true);
      }}
      onPointerLeave={() => {
        if (!campus && !root.current?.contains(document.activeElement)) setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          e.stopPropagation();
        }
      }}
    >
      <button
        className="project-hover-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onFocus={() => {
          if (!campus) setOpen(true);
        }}
        onClick={() => {
          if (campus) setOpen((v) => !v);
          else {
            setOpen(false);
            onOpen();
          }
        }}
      >
        <span className="dropdown-project-dot" style={{ background: project.color }} />
        <span className="dropdown-project-title">
          <strong>
            {project.name}
            {(live?.publicLinks?.length || 0) > 1 && (
              <span className="product-count"> · {open ? "Close campus" : "Explore apps"}</span>
            )}
          </strong>
          <small>
            {live
              ? activityLabel(live, Date.parse(observedAt!))
              : project.status === "in progress"
                ? "Working now"
                : project.status === "blocked"
                  ? "Needs attention"
                  : "At the hub"}
          </small>
        </span>
      </button>
      {open && campus ? (
        <div className="campus-showcase" id={panelId} role="region" aria-label="Product showcase">
          <div className="campus-showcase-heading">
            <span>PRODUCT CAMPUS</span>
            <button aria-label="Close product campus" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <ProductCampus mini name={project.name} links={live?.publicLinks || []} />
          <button
            className="campus-details"
            onClick={() => {
              setOpen(false);
              onOpen();
            }}
          >
            Project activity & details ↗
          </button>
        </div>
      ) : (
        open && (
          <div
            className="project-hover-surface"
            id={panelId}
            role="region"
            aria-label={`${project.name} information`}
          >
            <div className="project-dropdown-body">
              <span className="eyebrow">{focus?.label || "PROJECT WORK"}</span>
              <p>{focus?.text || project.description}</p>
              <button
                onClick={() => {
                  setOpen(false);
                  onOpen();
                }}
              >
                View details <span>↗</span>
              </button>
              {(live?.publicLinks?.length || 0) > 1 && (
                <ProductCampus name={project.name} links={live?.publicLinks || []} />
              )}
              {(live?.publicLinks?.length || 0) <= 1 &&
                live?.publicLinks?.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label} ↗
                  </a>
                ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
