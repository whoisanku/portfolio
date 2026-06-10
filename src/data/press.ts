export interface PressMention {
  outlet: string;
  region: string;
  title: string;
  url: string;
}

/** Articles & magazines covering Porto (and friends). */
export const pressMentions: PressMention[] = [
  {
    outlet: "Lifehacker",
    region: "US",
    title: "Use Porto to upload all your old tweets to Bluesky",
    url: "https://lifehacker.com/tech/use-porto-to-upload-all-your-old-tweets-to-bluesky",
  },
  {
    outlet: "Mashable",
    region: "US",
    title: "Importing your tweets and X posts to Bluesky",
    url: "https://mashable.com/article/bluesky-importing-tweets-x-posts",
  },
  {
    outlet: "Popular Science",
    region: "US",
    title: "How to leave Twitter for Bluesky",
    url: "https://www.popsci.com/diy/how-to-leave-twitter-for-bluesky/",
  },
  {
    outlet: "TechWiser",
    region: "India",
    title: "5 Chrome extensions to switch from X (Twitter) to Bluesky",
    url: "https://techwiser.com/chrome-extensions-to-switch-from-twitter-to-bluesky/",
  },
  {
    outlet: "AllThings.How",
    region: "India",
    title: "How to use Porto to port your tweets from X to Bluesky",
    url: "https://allthings.how/how-to-use-porto-to-port-your-tweets-from-x-to-bluesky/",
  },
  {
    outlet: "Geeknetic",
    region: "Spain",
    title: "Cómo pasarse a Bluesky desde Twitter (X)",
    url: "https://www.geeknetic.es/Guia/2991/Como-pasarse-a-Bluesky-desde-Twitter-X.html",
  },
];
