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
      front: "https://res.cloudinary.com/dvnt65etc/image/upload/f_auto,q_auto/portfolio/porto-front",
      back: "https://res.cloudinary.com/dvnt65etc/image/upload/f_auto,q_auto/portfolio/porto-back",
    },
  },
  {
    title: "Churpico",
    description:
      "Himalayan yak cheese dog chews from Nepal, with an evidence-led journal on chew safety, sizing and how churpi is made.",
    url: "https://www.churpico.com",
    // Screenshots of the site in its dark "Smokehouse" theme: home hero + the yak chew guide
    screenshotStack: {
      front: "/projects/churpico-front.webp",
      back: "/projects/churpico-back.webp",
    },
  },
  {
    title: "Sluice",
    description:
      "Decentralized AI routing layer that sends each request to the best provider across cost, speed, quality and privacy.",
    url: "https://thesluice.xyz",
    screenshotStack: {
      front: "https://res.cloudinary.com/dvnt65etc/image/upload/f_auto,q_auto/portfolio/sluice-front",
      back: "https://res.cloudinary.com/dvnt65etc/image/upload/f_auto,q_auto/portfolio/sluice-back",
    },
  },
  {
    title: "LensPool",
    description:
      "Marketplace for Lens Protocol usernames with listings, offers, wallet flows and on-chain ownership details.",
    url: "https://github.com/Aryog/lenspool",
    screenshotStack: {
      front: "https://res.cloudinary.com/dvnt65etc/image/upload/f_auto,q_auto/portfolio/lenspool-front",
      back: "https://res.cloudinary.com/dvnt65etc/image/upload/f_auto,q_auto/portfolio/lenspool-back",
    },
  },
];
