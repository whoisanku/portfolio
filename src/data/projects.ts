import { cloudinary } from "../lib/image";

/**
 * A screenshot in two sizes: `thumb` for the ~110px-tall cards on the home
 * page (sized for 3x screens), `src` for the lightbox.
 */
export interface Shot {
  src: string;
  thumb: string;
}

export interface Project {
  title: string;
  description: string;
  url: string;
  screenshot?: Shot;
  /** Two app screens shown as overlapping cards rising from the bottom edge —
      hovering a card brings it to the front. */
  screenshotStack?: { front: Shot; back: Shot };
}

const CLOUDINARY_BASE = "https://res.cloudinary.com/dvnt65etc/image/upload/f_auto,q_auto/portfolio";

/** A screenshot hosted on Cloudinary, resized on delivery. */
const cloudinaryShot = (id: string): Shot => ({
  src: cloudinary(`${CLOUDINARY_BASE}/${id}`, "c_limit,w_1800,h_1800"),
  thumb: cloudinary(`${CLOUDINARY_BASE}/${id}`, "c_limit,w_480,h_480"),
});

/**
 * A screenshot in public/projects/. Needs a `<name>-thumb.webp` alongside
 * `<name>.webp`, at most 480px on its longest side.
 */
const localShot = (name: string): Shot => ({
  src: `/projects/${name}.webp`,
  thumb: `/projects/${name}-thumb.webp`,
});

export const projects: Project[] = [
  {
    title: "Porto",
    description:
      "Move your tweets to Bluesky in a few clicks, processed fully on your device. Featured by Lifehacker, Mashable and more.",
    url: "https://github.com/Nester-xyz/Porto",
    screenshotStack: {
      front: cloudinaryShot("porto-front"),
      back: cloudinaryShot("porto-back"),
    },
  },
  {
    title: "Churpico",
    description:
      "Himalayan yak cheese dog chews from Nepal, with an evidence-led journal on chew safety, sizing and how churpi is made.",
    url: "https://www.churpico.com",
    // Screenshots of the site in its dark "Smokehouse" theme: home hero + the yak chew guide
    screenshotStack: {
      front: localShot("churpico-front"),
      back: localShot("churpico-back"),
    },
  },
  {
    title: "Sluice",
    description:
      "Decentralized AI routing layer that sends each request to the best provider across cost, speed, quality and privacy.",
    url: "https://thesluice.xyz",
    screenshotStack: {
      front: cloudinaryShot("sluice-front"),
      back: cloudinaryShot("sluice-back"),
    },
  },
  {
    title: "LensPool",
    description:
      "Marketplace for Lens Protocol usernames with listings, offers, wallet flows and on-chain ownership details.",
    url: "https://github.com/Aryog/lenspool",
    screenshotStack: {
      front: cloudinaryShot("lenspool-front"),
      back: cloudinaryShot("lenspool-back"),
    },
  },
];
