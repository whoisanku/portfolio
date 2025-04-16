import React from "react";
import { LuArrowUpRight } from "react-icons/lu";

interface Project {
  id: number;
  title: string;
  description: string;
  url: string;
}

const projects: Project[] = [
  {
    id: 1,
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
    <main className="mx-auto max-w-3xl px-6 py-2">
      {/* Project “stack” */}
      <section className="flex flex-wrap justify-center gap-6">
        {projects.map((p) => (
          <a
            key={p.id}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              w-full sm:max-w-md h-30 group relative flex flex-col justify-start gap-2 rounded-lg border border-[#2563eb]/20 p-4 transition-all duration-300 transform
              hover:border-[#2563eb] hover:shadow-[0_8px_10px_-5px_rgba(37,99,235,0.15),0_3px_5px_-3px_rgba(37,99,235,0.15)] hover:scale-105
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
              <h3 className="text-lg font-medium text-[#2563eb]">{p.title}</h3>
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
    </main>
  );
};

export default Home;
