export interface Project {
  title: string;
  description: string;
  url: string;
  screenshot?: string;
  /** Two app screens shown as overlapping cards rising from the bottom edge —
      hovering a card brings it to the front. */
  screenshotStack?: { front: string; back: string };
}

export const projects: Project[] = [
  {
    title: "Porto",
    description:
      "Import your tweets to Bluesky in a few clicks — 100% local processing, media included. Featured by Lifehacker, Mashable & more.",
    url: "https://github.com/Nester-xyz/Porto",
    screenshotStack: {
      front: "https://api.grove.storage/553c929054726e2c5b2bcce5ae94bc327565d2e731da3cec0eb2d89d1fcf38e3",
      back: "https://api.grove.storage/32835651456c3063e1ddfbfa12c20ed3cf23fb783aa82cbc5cad5a9ad6f8d935",
    },
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
