import { useEffect, useState } from "react";
import { PUBLIC_API } from "../lib/config";


interface ScienceAccount {
  name: string;
  url: string;
  platform: "bsky" | "x";
  actor?: string;
  localAvatar?: string;
}

const accounts: ScienceAccount[] = [
  {
    name: "Saganism",
    url: "https://bsky.app/profile/sagan.bsky.social",
    platform: "bsky",
    actor: "sagan.bsky.social",
  },
  {
    name: "Astronomy",
    url: "https://bsky.app/profile/astronomy.bsky.social",
    platform: "bsky",
    actor: "astronomy.bsky.social",
  },
  {
    name: "Physics",
    url: "https://bsky.app/profile/physics.bsky.social",
    platform: "bsky",
    actor: "physics.bsky.social",
  },
  {
    name: "Cosmos Archive",
    url: "https://x.com/cosmosarcive",
    platform: "x",
    localAvatar: "https://res.cloudinary.com/dvnt65etc/image/upload/f_auto,q_auto/portfolio/science-avatar",
  },
];

const ScienceAccounts = () => {
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    const actors = accounts
      .map((a) => a.actor)
      .filter((a): a is string => Boolean(a));
    if (actors.length === 0) return;

    const query = actors.map((a) => `actors=${encodeURIComponent(a)}`).join("&");
    fetch(`${PUBLIC_API}/xrpc/app.bsky.actor.getProfiles?${query}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch profiles");
        return res.json();
      })
      .then((data: { profiles?: { handle: string; avatar?: string }[] }) => {
        const map: Record<string, string> = {};
        for (const profile of data.profiles ?? []) {
          if (profile.avatar) map[profile.handle] = profile.avatar;
        }
        setAvatars(map);
      })
      .catch(() => {
        /* chips fall back to a monogram avatar */
      });
  }, []);

  return (
    <section>
      <div className="section-label section-label-strong mb-4">
        <span>Science &amp; astronomy</span>
      </div>
      <p className="mb-5 max-w-[52ch] text-[14px] leading-[1.55] text-ink-2">
        Working in tech, but sharing my lifelong passion for science and astronomy as a part-time hobby.
      </p>

      <div className="flex flex-wrap gap-2.5">
        {accounts.map((account) => {
          const avatar = account.localAvatar || (account.actor ? avatars[account.actor] : undefined);
          return (
            <a
              key={account.url}
              href={account.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2.5 rounded-full border border-line bg-raise/40 py-1 pr-3.5 pl-1 transition-all hover:bg-raise"
            >
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-line bg-raise">
                {avatar ? (
                  <img
                    src={avatar}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-115"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-[13px] text-ink-3 transition-transform duration-300 group-hover:scale-115">
                    {account.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="font-sans text-[13px] font-medium text-ink transition-colors group-hover:text-accent">
                {account.name}
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
};

export default ScienceAccounts;
