import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useOutletContext } from "react-router-dom";
import { pressMentions } from "../data/press";
import { projects } from "../data/projects";


const HomePage = () => {
  const { avatarUrl } = useOutletContext<{ avatarUrl: string | null }>();

  return (
    <div className="flex flex-col gap-28">
      {/* Hero */}
      <section className="flex flex-col gap-7">
        {avatarUrl ? (
          <motion.img
            layoutId="profile-avatar"
            src={avatarUrl}
            alt="Ankit Bhandari"
            className="h-[72px] w-[72px] rounded-full border border-line object-cover"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        ) : (
          <motion.div
            layoutId="profile-avatar"
            className="h-[72px] w-[72px] rounded-full border border-line bg-raise"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
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
          {projects.map((project) => (
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
              {project.screenshotStack ? (
                <div className="project-stack">
                  <img
                    src={project.screenshotStack.back}
                    alt={`${project.title} second screen`}
                    className="project-stack-card project-stack-back"
                    draggable={false}
                  />
                  <img
                    src={project.screenshotStack.front}
                    alt={`${project.title} main screen`}
                    className="project-stack-card project-stack-front"
                    draggable={false}
                  />
                </div>
              ) : project.screenshot ? (
                <div className="project-row-screenshot">
                  <img
                    src={project.screenshot}
                    alt={`${project.title} screenshot`}
                    className="project-row-screenshot-img"
                  />
                </div>
              ) : (
                <div className="project-stack">
                  <div className="project-stack-card project-stack-back project-stack-placeholder-card" />
                  <div className="project-stack-card project-stack-front project-stack-placeholder-card">
                    <span>{project.title.charAt(0)}</span>
                  </div>
                </div>
              )}
            </a>
          ))}
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
              <li>Developed an AI-powered onboarding agent using FastAPI, integrating advanced LLM-based capabilities to streamline restaurant partner onboarding.</li>
              <li>Engineered React-based updates for the primary onboarding portal, optimizing UI/UX performance and ensuring seamless integration with backend services.</li>
              <li>Enhanced overall pipeline scalability and reliability by implementing feature optimizations and robust automation enhancements.</li>
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
              <li>Led frontend development and implemented polished user interfaces, OAuth integration for ATProto, and client-side flows for Porto — a tweet migration extension with 4,000+ users.</li>
              <li>Built and optimized browser extensions utilizing robust message-passing systems, background service workers, and active state synchronization across extension contexts.</li>
              <li>Helped architect smart contracts and designed decentralized protocols and Web3 integrations across multiple testnets and mainnets.</li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
