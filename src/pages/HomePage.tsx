import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useOutletContext } from "react-router-dom";
import ScienceAccounts from "../components/ScienceAccounts";
import { pressMentions } from "../data/press";
import { projects } from "../data/projects";


const HomePage = () => {
  const { avatarUrl } = useOutletContext<{ avatarUrl: string | null }>();
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Keyboard navigation for lightbox (Escape to close)
  useEffect(() => {
    if (!lightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightbox(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightbox) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightbox]);

  const openLightbox = (imageUrl: string) => {
    setLightbox(imageUrl);
  };

  return (
    <div className="flex flex-col gap-28">
      {/* Hero */}
      <section className="flex flex-col gap-7">
        <motion.img
          layoutId="profile-avatar"
          src={avatarUrl ?? "https://res.cloudinary.com/dvnt65etc/image/upload/f_auto,q_auto/v1781422173/portfolio/profile"}
          alt="Ankit Bhandari"
          className="h-[72px] w-[72px] rounded-full border border-line object-cover"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
        <h1 className="font-display text-[40px] leading-[1.08] font-normal tracking-[-0.01em] text-balance sm:text-[49px]">
          Ankit <em className="italic text-accent">loves</em> designing &amp; building with AI.
        </h1>
      </section>

      {/* Selected work */}
      <section>
        <div className="section-label section-label-strong mb-5">
          <span>Selected work</span>
        </div>
        <div className="flex flex-col">
          {projects.map((project, idx) => {
            const eager = idx === 0;
            return (
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
                    className="shrink-0 text-ink-3 opacity-0 -translate-x-1 transition-all duration-200 group-hover:translate-x-0 group-hover:text-accent group-hover:opacity-100"
                  />
                </div>
                <p className="text-pretty text-[13.5px] leading-[1.55] text-ink-2">
                  {project.description}
                </p>
              </div>

              {/* Right: screenshot area */}
              {project.screenshotStack ? (() => {
                const stack = project.screenshotStack;
                return (
                  <div className="project-stack">
                    <img
                      src={stack.back}
                      alt={`${project.title} second screen`}
                      className="project-stack-card project-stack-back cursor-zoom-in"
                      loading="lazy"
                      draggable={false}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openLightbox(stack.back);
                      }}
                    />
                    <img
                      src={stack.front}
                      alt={`${project.title} main screen`}
                      className="project-stack-card project-stack-front cursor-zoom-in"
                      loading={eager ? "eager" : "lazy"}
                      draggable={false}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openLightbox(stack.front);
                      }}
                    />
                  </div>
                );
              })() : project.screenshot ? (() => {
                const screenshot = project.screenshot;
                return (
                  <div className="project-row-screenshot">
                    <img
                      src={screenshot}
                      alt={`${project.title} screenshot`}
                      className="project-row-screenshot-img cursor-zoom-in"
                      loading={eager ? "eager" : "lazy"}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openLightbox(screenshot);
                      }}
                    />
                  </div>
                );
              })() : (
                <div className="project-stack">
                  <div className="project-stack-card project-stack-back project-stack-placeholder-card" />
                  <div className="project-stack-card project-stack-front project-stack-placeholder-card">
                    <span>{project.title.charAt(0)}</span>
                  </div>
                </div>
              )}
            </a>
            );
          })}
        </div>
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
                {pressMentions.map((mention) => (
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
                      style={{ height: mention.logoHeight ?? 28 }}
                      loading="lazy"
                      draggable={false}
                    />
                  </a>
                ))}
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

      {/* Fullscreen Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 transition-all duration-300 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          {/* Active Image Container */}
          <div className="relative flex max-h-[85vh] max-w-full items-center justify-center">
            <img
              src={lightbox}
              alt="Project screen"
              className="max-h-[85vh] max-w-full rounded-lg object-contain select-none shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default HomePage;
