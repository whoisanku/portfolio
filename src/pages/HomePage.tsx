import { ArrowUpRight } from "lucide-react";
import { pressMentions } from "../data/press";
import { projects } from "../data/projects";

const HomePage = () => (
  <div className="mx-auto max-w-2xl py-2">
    {/* Projects */}
    <section className="flex flex-wrap justify-center gap-5">
      {projects.map((project) => (
        <a
          key={project.title}
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex w-full flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 backdrop-blur-sm transition-colors duration-300 hover:border-blue-500/60 sm:max-w-[18rem]"
        >
          <header className="flex items-start justify-between gap-3">
            <h3 className="font-medium text-blue-500">{project.title}</h3>
            <ArrowUpRight
              size={16}
              className="mt-0.5 shrink-0 text-blue-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          </header>
          <p className="text-sm leading-relaxed text-zinc-400">
            {project.description}
          </p>
        </a>
      ))}
    </section>

    <hr className="mx-auto my-12 max-w-lg border-t border-dashed border-zinc-700" />

    {/* Press */}
    <section className="mx-auto max-w-lg">
      <h2 className="mb-6 text-center text-lg font-medium text-zinc-200">
        Featured in
      </h2>
      <ul className="flex flex-col">
        {pressMentions.map((mention) => (
          <li key={mention.url}>
            <a
              href={mention.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-baseline justify-between gap-4 rounded-md px-3 py-2.5 transition-colors hover:bg-zinc-900"
            >
              <span className="flex min-w-0 items-baseline gap-3">
                <span className="shrink-0 text-sm font-medium text-zinc-200 group-hover:text-blue-400">
                  {mention.outlet}
                </span>
                <span className="truncate text-sm text-zinc-500">
                  {mention.title}
                </span>
              </span>
              <span className="shrink-0 text-xs uppercase tracking-wide text-zinc-600">
                {mention.region}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  </div>
);

export default HomePage;
