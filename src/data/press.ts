export interface PressMention {
  outlet: string;
  region: string;
  title: string;
  url: string;
  logo: string;
  logoHeight?: number;
  /** Artwork is light-on-dark; flip it when sitting on light paper. */
  logoInvert?: boolean;
}

/** Articles & magazines covering Porto (and friends). */
export const pressMentions: PressMention[] = [
  {
    outlet: "Lifehacker",
    region: "US",
    title: "Use Porto to upload all your old tweets to Bluesky",
    url: "https://lifehacker.com/tech/use-porto-to-upload-all-your-old-tweets-to-bluesky",
    logo: "https://api.grove.storage/d5b67395ba90366344ced70605c1874f1a4c19d97abc87bbafa2912363b5ad10",
    logoHeight: 32,
  },
  {
    outlet: "Mashable",
    region: "US",
    title: "Importing your tweets and X posts to Bluesky",
    url: "https://mashable.com/article/bluesky-importing-tweets-x-posts",
    logo: "https://api.grove.storage/31300d206a783a5445825fbd5c3fd2571d7c7f6bfd14471d48381efb1156624c",
    logoHeight: 28,
  },
  {
    outlet: "Popular Science",
    region: "US",
    title: "How to leave Twitter for Bluesky",
    url: "https://www.popsci.com/diy/how-to-leave-twitter-for-bluesky/",
    logo: "https://api.grove.storage/0eada6c50928c50f0ae38b1213a465dd9b786ced38eb718b8d03741c26c3e595",
    logoHeight: 44,
  },
  {
    outlet: "TechWiser",
    region: "India",
    title: "5 Chrome extensions to switch from X (Twitter) to Bluesky",
    url: "https://techwiser.com/chrome-extensions-to-switch-from-twitter-to-bluesky/",
    logo: "https://api.grove.storage/a2eb34e0a4905f748b8ce6828d172cdd8d35220bcafc22ebaa9888341d1093f0",
    logoHeight: 25,
  },
  {
    outlet: "AllThings.How",
    region: "India",
    title: "How to use Porto to port your tweets from X to Bluesky",
    url: "https://allthings.how/how-to-use-porto-to-port-your-tweets-from-x-to-bluesky/",
    logo: "https://api.grove.storage/358cadbec71c337850a07d02adb95c8ed53df6e6ecbec6eac3187f1a53ed3bf5",
    logoHeight: 34,
  },
  {
    outlet: "Geeknetic",
    region: "Spain",
    title: "Cómo pasarse a Bluesky desde Twitter (X)",
    url: "https://www.geeknetic.es/Guia/2991/Como-pasarse-a-Bluesky-desde-Twitter-X.html",
    logo: "https://api.grove.storage/ce7c6dcd005c217c1734a81aa5d41c35bf18bdb0930edd14f1a33b65a8a954c8",
    logoHeight: 30,
    logoInvert: true,
  },
];
