import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import DidYouKnow from "../components/DidYouKnow";
import Lightbox, { type Gallery } from "../components/Lightbox";
import OwnerAvatar from "../components/OwnerAvatar";
import { ProjectRow, type OpenShots } from "../components/ProjectRow";
import ScienceAccounts from "../components/ScienceAccounts";
import { pressMentions } from "../data/press";
import { projects, type Project, type Shot } from "../data/projects";
import { usePlayWhenVisible } from "../lib/usePlayWhenVisible";

/** Projects shown up front; the rest wait under the fold. */
const FEATURED_COUNT = 3;
const featuredProjects = projects.slice(0, FEATURED_COUNT);
const foldedProjects = projects.slice(FEATURED_COUNT);
/** How much of the fold shows while closed: the gap between rows plus the top of the next one. */
const FOLD_PEEK = 96;

/**
 * The projects past the first three, folded away. The next row peeks out
 * and dissolves into the paper; the pill in the wavy rule, or a click on the
 * peek itself, lets the rest down.
 */
const FoldedProjects = ({ projects, onOpen }: { projects: Project[]; onOpen: OpenShots }) => {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  return (
    <>
      <m.div
        id="folded-projects"
        className="project-fold"
        data-open={open || undefined}
        initial={false}
        animate={{ height: open ? "auto" : FOLD_PEEK }}
        transition={reduce ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        onClick={open ? undefined : () => setOpen(true)}
      >
        {/* Folded rows stay out of the tab order and the accessibility tree,
            and clicks on the peek fall through to the fold */}
        <div className="flex flex-col pt-11" inert={!open}>
          {projects.map((project) => (
            <ProjectRow key={project.title} project={project} onOpen={onOpen} />
          ))}
        </div>
      </m.div>
      <button
        type="button"
        className="project-fold-toggle"
        aria-expanded={open}
        aria-controls="folded-projects"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="project-fold-wave" aria-hidden="true" />
        <span className="project-fold-pill pressable">
          {open ? "show less" : `show ${projects.length} more`}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}
          />
        </span>
        <span className="project-fold-wave" aria-hidden="true" />
      </button>
    </>
  );
};

const HomePage = () => {
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  usePlayWhenVisible(marqueeRef);

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
          I <em className="italic text-accent">love</em> designing &amp; software development.
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
            {featuredProjects.map((project, idx) => (
              <ProjectRow key={project.title} project={project} eager={idx === 0} onOpen={openShots} />
            ))}
          </div>
        </div>
        {foldedProjects.length > 0 && <FoldedProjects projects={foldedProjects} onOpen={openShots} />}
        {/* Narrow screens: the note follows the project list */}
        <DidYouKnow placement="inline" />
      </section>

      {/* Press — logo marquee */}
      <section>
        <div className="mb-4 text-center font-hand text-[20px] leading-[1.1] font-medium tracking-[0.01em] text-ink-3">
          Featured in
        </div>
        <div ref={marqueeRef} className="press-marquee">
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
