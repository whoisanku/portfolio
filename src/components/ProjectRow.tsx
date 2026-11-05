import { useState, type MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Project, Shot } from "../data/projects";

export type OpenShots = (shots: Shot[], index: number) => void;

/**
 * A project's screenshots: two overlapping cards, or a placeholder. The pair
 * fades in together once both have loaded (immediately when cached), rather
 * than each card popping in on its own.
 */
export const ProjectShots = ({
  project,
  eager,
  onOpen,
}: {
  project: Project;
  eager: boolean;
  onOpen: OpenShots;
}) => {
  // Which cards have loaded (or failed — nothing more to wait for).
  const [settled, setSettled] = useState<readonly boolean[]>([false, false]);
  const stack = project.screenshotStack;
  const shots = stack ? [stack.front, stack.back] : project.screenshot ? [project.screenshot] : [];

  if (shots.length === 0) {
    return (
      <div className="project-stack" data-ready="">
        <div className="project-stack-card project-stack-back project-stack-placeholder-card" />
        <div className="project-stack-card project-stack-front project-stack-placeholder-card">
          <span>{project.title.charAt(0)}</span>
        </div>
      </div>
    );
  }

  const settle = (index: number) => () =>
    setSettled((prev) => (prev[index] ? prev : prev.map((v, i) => v || i === index)));
  // Already in the cache: ready before first paint, no fade.
  const settleIfCached = (index: number) => (img: HTMLImageElement | null) => {
    if (img?.complete) settle(index)();
  };
  const open = (index: number) => (e: MouseEvent) => {
    // The cards sit inside the project's link; open the viewer instead.
    e.preventDefault();
    e.stopPropagation();
    onOpen(shots, index);
  };
  const ready = shots.every((_, i) => settled[i]);

  if (!stack) {
    return (
      <div className="project-row-screenshot project-shots" data-ready={ready ? "" : undefined}>
        <img
          ref={settleIfCached(0)}
          src={shots[0].thumb}
          alt={`${project.title} screenshot`}
          className="project-row-screenshot-img cursor-zoom-in"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={settle(0)}
          onError={settle(0)}
          onClick={open(0)}
        />
      </div>
    );
  }

  return (
    <div className="project-stack project-shots" data-ready={ready ? "" : undefined}>
      <img
        ref={settleIfCached(1)}
        src={stack.back.thumb}
        alt={`${project.title} second screen`}
        className="project-stack-card project-stack-back cursor-zoom-in"
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onLoad={settle(1)}
        onError={settle(1)}
        onClick={open(1)}
      />
      <img
        ref={settleIfCached(0)}
        src={stack.front.thumb}
        alt={`${project.title} main screen`}
        className="project-stack-card project-stack-front cursor-zoom-in"
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        onLoad={settle(0)}
        onError={settle(0)}
        onClick={open(0)}
      />
    </div>
  );
};

/** One project: name and blurb on the left, its screens on the right. */
export const ProjectRow = ({
  project,
  eager = false,
  onOpen,
  className = "",
}: {
  project: Project;
  eager?: boolean;
  onOpen: OpenShots;
  className?: string;
}) => (
  <a
    href={project.url}
    target="_blank"
    rel="noopener noreferrer"
    className={`project-row group ${className}`}
  >
    <div className="project-row-text">
      <div className="flex items-center gap-2">
        <h3 className="font-display text-[22px] leading-[1.2] font-medium transition-colors duration-200 group-hover:text-accent">
          {project.title}
        </h3>
        <ArrowUpRight
          size={16}
          className="shrink-0 text-ink-3 opacity-0 -translate-x-1 transition duration-200 group-hover:translate-x-0 group-hover:text-accent group-hover:opacity-100"
        />
      </div>
      <p className="text-pretty text-[13.5px] leading-[1.55] text-ink-2">{project.description}</p>
    </div>
    <ProjectShots project={project} eager={eager} onOpen={onOpen} />
  </a>
);
