import { ArrowUpRight } from "lucide-react";

/** Ankit's Threads post about joining Anthropic's Claude for Open Source. */
const POST_URL = "https://www.threads.com/@whoisanku/post/Da8k-KtEYj2";

/**
 * "Did you know?" margin note: a card, in the site's own tokens, linking to
 * Ankit's Threads post on getting into Claude for Open Source. The home page
 * renders two copies and CSS shows one: `inline` below the project list on
 * narrow screens, `margin` in the right gutter level with the first project
 * row on wide ones (see .did-you-know in index.css).
 */
const DidYouKnow = ({
  avatarUrl,
  placement,
}: {
  avatarUrl: string | null;
  placement: "inline" | "margin";
}) => (
  <a
    href={POST_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Did you know? Ankit was accepted into Anthropic's Claude for Open Source program. Read his post on Threads"
    className={`did-you-know did-you-know-${placement} pressable group flex flex-col gap-3.5 rounded-2xl border border-line bg-raise/40 p-4 hover:bg-raise`}
  >
    <div className="flex items-center justify-between">
      <span className="font-mono text-[12px] tracking-[0.03em] text-accent">did you know?</span>
      <svg
        viewBox="0 0 24 24"
        className="h-[14px] w-[14px] text-ink-3 transition-colors duration-200 group-hover:text-ink"
        fill="currentColor"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z" />
      </svg>
    </div>

    <p className="font-display text-[18.5px] leading-[1.35] text-pretty text-ink">
      Ankit was accepted into Anthropic's{" "}
      <em className="italic text-accent">Claude for Open Source</em> program, which came
      with six months of Claude Max 20x.
    </p>

    <div className="wavy-rule" aria-hidden="true" />

    <div className="flex items-center gap-2.5">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-7 w-7 shrink-0 rounded-full border border-line object-cover"
        />
      ) : (
        <span className="h-7 w-7 shrink-0 rounded-full border border-line bg-raise" />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[12.5px] font-medium leading-[1.3] text-ink">
          Ankit Bhandari
        </span>
        <span className="truncate font-mono text-[11px] leading-[1.4] text-ink-3">
          @whoisanku on Threads
        </span>
      </span>
      <ArrowUpRight
        size={15}
        className="shrink-0 text-ink-3 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
      />
    </div>
  </a>
);

export default DidYouKnow;
