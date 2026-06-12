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
      "Move your tweets to Bluesky in a few clicks, processed fully on your device. Featured by Lifehacker, Mashable and more.",
    url: "https://github.com/Nester-xyz/Porto",
    screenshotStack: {
      front: "https://api.grove.storage/553c929054726e2c5b2bcce5ae94bc327565d2e731da3cec0eb2d89d1fcf38e3",
      back: "https://api.grove.storage/32835651456c3063e1ddfbfa12c20ed3cf23fb783aa82cbc5cad5a9ad6f8d935",
    },
  },
  {
    title: "Sluice",
    description:
      "Decentralized AI routing layer that sends each request to the best provider across cost, speed, quality and privacy.",
    url: "https://thesluice.xyz",
    screenshotStack: {
      front: "https://api.grove.storage/ccbc75c145bb56dddb6a145bd50536161377948ed455c7c7bbf03fd711f2052c",
      back: "https://api.grove.storage/dc4495ece1687fc359930615167c37e10169eb16b784e77adb80e4fde3a89ba9",
    },
  },
  {
    title: "Waverly",
    description:
      "Productivity extension where I added background jobs, reworked the UI and modernized the build pipeline.",
    url: "https://github.com/waverly",
  },
];
