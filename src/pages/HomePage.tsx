import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { useOutletContext } from "react-router-dom";
import { pressMentions } from "../data/press";
import { projects } from "../data/projects";


const Arrow = ({ className = "" }: { className?: string }) => (
  <ArrowUpRight
    size={18}
    className={`shrink-0 text-ink-3 transition-all duration-200 group-hover:translate-x-[3px] group-hover:-translate-y-[3px] group-hover:text-accent ${className}`}
  />
);

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
          Ankit builds tools that help people{" "}
          <em className="italic text-accent">move freely</em> on the open web.
        </h1>
        <p className="max-w-[48ch] text-pretty text-ink-2">
          Engineer &amp; product designer working on the AT Protocol. I make
          browser extensions and small, sharp tools — most recently Porto, which
          helped thousands migrate their tweets to Bluesky.
        </p>

      </section>

      {/* Selected work */}
      <section className="mt-24">
        <div className="section-label mb-5">
          <span>Selected work</span>
        </div>
        <div className="flex flex-col">
          {projects.map((project, index) => (
            <a
              key={project.title}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group grid grid-cols-[1fr_auto] items-baseline gap-5 border-b border-line py-6 first:pt-0 sm:grid-cols-[44px_1fr_auto]"
            >
              <span className="hidden font-mono text-[12.5px] text-ink-3 sm:block">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex flex-col gap-2">
                <h3 className="font-display text-[24px] leading-[1.2] font-medium transition-colors duration-200 group-hover:text-accent">
                  {project.title}
                </h3>
                <p className="max-w-[52ch] text-pretty text-[14px] text-ink-2">
                  {project.description}
                </p>
              </span>
              <Arrow />
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
              className="group grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-line py-3.5 first:pt-0 sm:grid-cols-[130px_1fr_auto]"
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

    </div>
  );
};

export default HomePage;
