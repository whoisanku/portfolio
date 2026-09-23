import { useState, type MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import DidYouKnow from "../components/DidYouKnow";
import Lightbox, { type Gallery } from "../components/Lightbox";
import OwnerAvatar from "../components/OwnerAvatar";
import ScienceAccounts from "../components/ScienceAccounts";
import { pressMentions } from "../data/press";
import { projects, type Project, type Shot } from "../data/projects";

/**
 * A project's screenshots: two overlapping cards, or a placeholder. The pair
 * fades in together once both have loaded (immediately when cached), rather
 * than each card popping in on its own.
 */
const ProjectShots = ({
  project,
  eager,
  onOpen,
}: {
  project: Project;
  eager: boolean;
  onOpen: (shots: Shot[], index: number) => void;
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

const HomePage = () => {
  const [gallery, setGallery] = useState<Gallery | null>(null);

  const openShots = (shots: Shot[], index: number) =>
    setGallery({
      images: shots.map((shot) => ({ src: shot.src, thumb: shot.thumb, alt: "Project screen" })),
      index,
    });

  return (
    <div className="flex flex-col gap-28">
      {/* Hero */}
      <section className="flex flex-col gap-7">
        <OwnerAvatar className="h-[72px] w-[72px]" />
        <h1 className="font-display text-[40px] leading-[1.08] font-normal tracking-[-0.01em] text-balance sm:text-[49px]">
          Ankit <em className="italic text-accent">loves</em> designing &amp; software development.
        </h1>
      </section>

      {/* Selected work */}
      <section>
        <div className="section-label section-label-strong mb-5">
          <span>Selected work</span>
        </div>
        <div className="relative">
          {/* Wide screens: the note hangs in the gutter, level with the first row */}
          <DidYouKnow placement="margin" />
          <div className="flex flex-col">
            {projects.map((project, idx) => (
              <a
                key={project.title}
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="project-row group"
              >
                {/* Left: text */}
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
                  <p className="text-pretty text-[13.5px] leading-[1.55] text-ink-2">
                    {project.description}
                  </p>
                </div>

                {/* Right: screenshots */}
                <ProjectShots project={project} eager={idx === 0} onOpen={openShots} />
              </a>
            ))}
          </div>
        </div>
        {/* Narrow screens: the note follows the project list */}
        <DidYouKnow placement="inline" />
      </section>

      {/* Press — logo marquee */}
      <section>
        <div className="mb-4 text-center font-mono text-[12px] font-medium uppercase tracking-[0.22em] text-ink-3">
          Featured in
        </div>
        <div className="press-marquee">
          <div className="press-marquee-track">
            {[0, 1, 2, 3].map((set) => (
              <div
                key={set}
                className="press-marquee-set"
                aria-hidden={set > 0 || undefined}
              >
                {pressMentions.map((mention) => {
                  const h = mention.logoHeight ?? 28;
                  // Reserve the exact box up front so the track width is stable
                  // from first paint — no reflow/jump as logos stream in.
                  const w = Math.round(h * mention.aspect);
                  return (
                    <a
                      key={mention.url}
                      href={mention.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`press-logo${mention.logoInvert ? " press-logo-flip" : ""}`}
                      title={mention.title}
                      aria-label={mention.outlet}
                      tabIndex={set > 0 ? -1 : undefined}
                    >
                      <img
                        src={mention.logo}
                        alt={mention.outlet}
                        width={w}
                        height={h}
                        style={{ height: h, width: w }}
                        decoding="async"
                        draggable={false}
                      />
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience */}
      <section>
        <div className="section-label section-label-strong mb-5">
          <span>Experience</span>
        </div>
        <div className="flex flex-col gap-12">
          {/* HoneyComb.AI */}
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-display text-[22px] font-medium text-ink">
                Applied AI &amp; Frontend Developer
              </h3>
              <span className="font-mono text-[12px] text-ink-3 shrink-0">
                2025 – 2026
              </span>
            </div>
            <div className="font-mono text-[13px] text-accent tracking-[0.02em]">
              HoneyComb.AI
            </div>
            <ul className="flex flex-col gap-2 text-[14.5px] text-ink-2 pl-4 list-disc marker:text-ink-3/60">
              <li>Built an AI onboarding agent with FastAPI and LLM tooling that streamlined restaurant partner onboarding.</li>
              <li>Shipped React updates for the onboarding portal with smoother UI flows and tighter backend integration.</li>
              <li>Improved pipeline scalability and reliability through feature optimizations and automation.</li>
            </ul>
          </div>

          {/* Nester-xyz */}
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-display text-[22px] font-medium text-ink">
                Frontend &amp; Web3 Developer
              </h3>
              <span className="font-mono text-[12px] text-ink-3 shrink-0">
                2023 – 2025
              </span>
            </div>
            <div className="font-mono text-[13px] text-accent tracking-[0.02em]">
              Nester-xyz
            </div>
            <ul className="flex flex-col gap-2 text-[14.5px] text-ink-2 pl-4 list-disc marker:text-ink-3/60">
              <li>Led frontend for Porto, a tweet migration extension with 4,000+ users, covering ATProto OAuth and client-side flows.</li>
              <li>Built browser extensions with message passing, service workers and state sync across extension contexts.</li>
              <li>Helped design smart contracts and Web3 integrations across multiple testnets and mainnets.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Science & astronomy — accounts I run */}
      <ScienceAccounts />

      <Lightbox gallery={gallery} onClose={() => setGallery(null)} />
    </div>
  );
};

export default HomePage;
