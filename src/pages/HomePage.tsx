import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useOutletContext } from "react-router-dom";
import { pressMentions } from "../data/press";
import { projects } from "../data/projects";


const HomePage = () => {
  const { avatarUrl } = useOutletContext<{ avatarUrl: string | null }>();

  return (
    <div>
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
          Ankit designs and builds at the intersection of{" "}
          <em className="italic text-accent">product design</em>, AI, and content writing.
        </h1>
        <p className="max-w-[48ch] text-pretty text-ink-2">
          Designer, developer, and writer. I craft intuitive user interfaces, experiment with artificial intelligence, and write articles exploring the future of software design.
        </p>

      </section>

      {/* Selected work */}
      <section className="mt-24">
        <div className="section-label mb-6">
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
              <div className="project-row-screenshot">
                {project.screenshot ? (
                  <img
                    src={project.screenshot}
                    alt={`${project.title} screenshot`}
                    className="project-row-screenshot-img"
                  />
                ) : (
                  <div className="project-row-screenshot-placeholder">
                    <span>{project.title.charAt(0)}</span>
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Press */}
      <section className="mt-24">
        <div className="section-label mb-5">
          <span>Featured in</span>
        </div>
        <div className="flex flex-col">
          {pressMentions.map((mention) => (
            <a
              key={mention.url}
              href={mention.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-line last:border-b-0 py-3.5 first:pt-0 sm:grid-cols-[130px_1fr_auto]"
            >
              <span className="text-[13px] font-semibold transition-colors duration-200 group-hover:text-accent">
                {mention.outlet}
              </span>
              <span className="hidden truncate font-display text-[15px] italic text-ink-2 sm:block">
                {mention.title}
              </span>
              <span className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">
                {mention.region}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section className="mt-24">
        <div className="section-label mb-5">
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
