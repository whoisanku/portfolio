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

/**
 * A project screen in public/projects/: `<name>.webp` (at most 1600px on its
 * longest side) and `<name>-thumb.webp` (at most 480px). The current set is
 * drawn rather than captured — each product's own UI rebuilt in HTML/CSS
 * from its code and tokens, cropped to the part worth seeing, and rendered
 * at 8x: fronts at 212x200, backs at 215x200 (the stack's back-card aspect).
 */
const localShot = (name: string): Shot => ({
  src: `/projects/${name}.webp`,
  thumb: `/projects/${name}-thumb.webp`,
});

/** A project's front and back screens, `<slug>-front` and `<slug>-back`. */
const stack = (slug: string) => ({ front: localShot(`${slug}-front`), back: localShot(`${slug}-back`) });

export const projects: Project[] = [
  {
    title: "Porto",
    description:
      "Move your tweets to Bluesky in a few clicks, processed fully on your device. Featured by Lifehacker, Mashable and more.",
    url: "https://github.com/Nester-xyz/Porto",
    screenshotStack: stack("porto"),
  },
  {
    title: "Churpico",
    description:
      "Himalayan yak cheese dog chews from Nepal, with an evidence-led journal on chew safety, sizing and how churpi is made.",
    url: "https://www.churpico.com",
    // The site in its dark "Smokehouse" theme: the hero, and the yak chew guide
    screenshotStack: stack("churpico"),
  },
  {
    title: "Sluice",
    description:
      "Decentralized AI routing layer that sends each request to the best provider across cost, speed, quality and privacy.",
    url: "https://thesluice.xyz",
    screenshotStack: stack("sluice"),
  },
  {
    title: "LensPool",
    description:
      "Marketplace for Lens Protocol usernames with listings, offers, wallet flows and on-chain ownership details.",
    url: "https://github.com/Aryog/lenspool",
    screenshotStack: stack("lenspool"),
  },
];
