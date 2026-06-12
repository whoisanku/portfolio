export interface Project {
  title: string;
  description: string;
  url: string;
  screenshot?: string; // path to app screenshot — leave undefined for placeholder
}

export const projects: Project[] = [
  {
    title: "Porto",
    description:
      "Import your tweets to Bluesky in a few clicks — 100% local processing, media included. Featured by Lifehacker, Mashable & more.",
    url: "https://github.com/Nester-xyz/Porto",
  },
  {
    title: "Connectsky",
    description:
      "Chrome extension for ATProtocol — service workers, message passing, slick UI.",
    url: "https://github.com/Nester-xyz/Connectsky",
  },
  {
    title: "Waverly",
    description:
      "Added background jobs, revamped the UI & Webpack bundle for this productivity extension.",
    url: "https://github.com/waverly",
  },
];
