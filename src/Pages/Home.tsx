import React from "react";
import { LuArrowUpRight } from "react-icons/lu";
import FloatingBlueskyProfile from "../Components/FloatingBlueskyProfile";
import CustomAccordion from "../Components/CustomAccordion";

interface Project {
  id: number;
  title: string;
  description: string;
  url: string;
}

const projects: Project[] = [
  {
    id: 1,
    title: "Porto",
    description:
      "Chrome extension for ATProtocol — service‑workers, message‑passing, slick UI.",
    url: "https://github.com/Nester-xyz/Connectsky",
  },
  {
    id: 2,
    title: "Connectsky",
    description:
      "Chrome extension for ATProtocol — service‑workers, message‑passing, slick UI.",
    url: "https://github.com/Nester-xyz/Connectsky",
  },
  {
    id: 2,
    title: "Waverly",
    description:
      "Added BG jobs, revamped UI & Webpack bundle for this productivity extension.",
    url: "https://github.com/waverly",
  },
  /* ✧ More projects here ✧ */
];

const Home: React.FC = () => {
  return (
    <main className="mx-auto max-w-3xl px-6 py-2 relative">
      {/* Left Bluesky Profile - Sagan */}
      <FloatingBlueskyProfile
        actorHandle="sagan.bsky.social"
        position={{ top: "22rem", left: "2rem" }}
      />
      {/* Right Bluesky Profile - Astronomy */}
      <FloatingBlueskyProfile
        actorHandle="astronomy.bsky.social"
        position={{ top: "-2.6rem", right: "1.5rem" }}
      />

      {/* Project "stack" */}
      <section className="flex flex-wrap justify-center gap-6">
        {projects.map((p) => (
          <a
            key={p.id}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              w-full sm:max-w-md h-30 group relative flex flex-col justify-start gap-2 rounded-lg border border-[#2563eb]/20 p-4 transition-all duration-300 transform
              hover:border-[#2563eb] hover:shadow-[0_8px_10px_-5px_rgba(37,99,235,0.15),0_3px_5px_-3px_rgba(37,99,235,0.15)]
              backdrop-blur-md bg-gray-900
            "
          >
            {/* blue glow overlay (appears on hover) */}
            <span
              aria-hidden
              className="
                pointer-events-none absolute inset-0 -z-10 rounded-lg
                bg-gradient-to-br from-[#2563eb]/10 to-transparent
                opacity-0 transition-opacity duration-300 group-hover:opacity-100
              "
            />

            {/* Title row */}
            <header className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-medium text-blue-500">{p.title}</h3>
              <LuArrowUpRight
                size={18}
                className="mt-0.5 shrink-0 text-[#2563eb] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
            </header>

            {/* Description */}
            <p className="text-sm leading-relaxed text-gray-400">
              {p.description}
            </p>
          </a>
        ))}
      </section>

      {/* Separator Line */}
      <div className="w-full max-w-lg mx-auto my-12 border-t border-dashed border-gray-600"></div>

      {/* Featured On Section */}
      <section className="mt-12 w-full max-w-lg mx-auto">
        <h2 className="text-2xl font-semibold text-white text-center mb-6">
          My works featured on
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12">
          <a
            href="https://lifehacker.com/tech/use-porto-to-upload-all-your-old-tweets-to-bluesky"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-60 hover:opacity-100 filter grayscale hover:grayscale-0 transition-all duration-300"
          >
            <img
              src="https://www.vectorlogo.zone/logos/lifehacker/lifehacker-ar21.svg"
              alt="Lifehacker"
              className="h-10 sm:h-12 object-contain"
            />
          </a>
          <a
            href="https://mashable.com/article/bluesky-importing-tweets-x-posts"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-60 hover:opacity-100 filter grayscale hover:grayscale-0 transition-all duration-300"
          >
            <img
              src="https://www.vectorlogo.zone/logos/mashable/mashable-ar21.svg"
              alt="Mashable"
              className="h-10 sm:h-12 object-contain"
            />
          </a>
          <a
            href="https://www.popsci.com/diy/how-to-leave-twitter-for-bluesky/"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-60 hover:opacity-100 filter grayscale hover:grayscale-0 transition-all duration-300"
          >
            <img
              src="https://cdn.brandfetch.io/idjcZe_Kep/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B"
              alt="Popular Science"
              className="h-10 sm:h-12 object-contain"
            />
          </a>
        </div>
      </section>

      {/* Separator Line */}
      <div className="w-full max-w-lg mx-auto my-12 border-t border-dashed border-gray-600"></div>

      {/* FAQ Section */}
      <section className="mt-12 w-full max-w-lg mx-auto">
        <h2 className="text-2xl font-semibold text-white text-center mb-6">
          Frequently Asked Questions
        </h2>
        <CustomAccordion
          type="single"
          collapsible
          items={[
            {
              value: "item-1",
              title: "What is your favorite programming language?",
              content: "I enjoy working with TypeScript and Python the most!",
            },
            {
              value: "item-2",
              title: "How can I contact you?",
              content:
                "You can reach out to me via the links on my profile or through the contact form on this site (if available).",
            },
            {
              value: "item-3",
              title: "Do you work on open source projects?",
              content:
                "Yes, I love contributing to open source! You can check out my GitHub profile for some of my work.",
            },
          ]}
        />
      </section>
    </main>
  );
};

export default Home;
