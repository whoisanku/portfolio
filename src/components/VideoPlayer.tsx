import { Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MEDIA_MAX_HEIGHT, type FeedVideo } from "../lib/feed";

const formatTime = (s: number): string => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/** iOS Safari (iPhone) exposes fullscreen only on the <video> element itself,
 *  via these non-standard methods — the standard Fullscreen API on a wrapping
 *  <div> is a no-op there. */
type IOSVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

/** Progress ring geometry: a 52px button with a 3px ring just inside its edge. */
const RING_SIZE = 52;
const RING_R = 23;
const RING_LEN = 2 * Math.PI * RING_R;

/** Wait this long (ms) before showing the loader, so a quick start or a
 *  momentary stall never flashes a spinner. */
const LOADER_DELAY = 200;

/**
 * Branded HLS player for Bluesky video embeds. Autoplays muted while in
 * view, pauses off-screen. Controls are always on — nothing waits for a
 * hover, so they work the same on a phone: a play/pause button wearing the
 * progress as a ring (it spins while the stream loads or buffers), the time
 * beside it, mute and fullscreen chips, and a seek strip along the bottom
 * edge. The frame size is locked from the post's aspect ratio so the layout
 * never reshapes while the stream loads.
 */
const VideoPlayer = ({ video }: { video: FeedVideo }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Stream attached and enough data to start; until then a play is queued
  const [ready, setReady] = useState(false);
  // Playback wants to run but is starved (initial load, stall, seek)
  const [waiting, setWaiting] = useState(false);
  const [loaderDue, setLoaderDue] = useState(false);
  const [failed, setFailed] = useState(false);
  // Bumped by "Retry" to tear down and re-attach the stream
  const [attempt, setAttempt] = useState(0);
  // `timeupdate` fires ~30–60×/s; throttle React state to ~4×/s so an in-view
  // autoplaying video doesn't re-render every frame and stutter page scroll.
  const lastTimeSyncRef = useRef(0);

  // Whether the frame is (mostly) on screen; autoplay follows it.
  const inViewRef = useRef(false);
  // A play the visitor asked for before the stream was ready
  const wantsPlayRef = useRef(false);

  // Attach the stream only as the video nears the viewport, so a long feed
  // doesn't fetch every playlist up front. hls.js (its light build, loaded on
  // first need) wherever Media Source is available; the native m3u8 path is
  // only for browsers without it (iPhone Safari). The order matters: Edge
  // answers "maybe" to canPlayType for HLS yet fails on a raw playlist.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;

    const startIfWanted = () => {
      if (inViewRef.current || wantsPlayRef.current) void el.play().catch(() => setWaiting(false));
    };

    const attach = async () => {
      // Autoplay is only allowed muted; set it on the element itself, not
      // just through React, before the source goes in.
      el.muted = muted;
      // On screen already (or asked to play): it's loading from here on
      if (inViewRef.current || wantsPlayRef.current) setWaiting(true);
      let Hls: typeof import("hls.js/light").default;
      try {
        ({ default: Hls } = await import("hls.js/light"));
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }
      if (cancelled) return;
      if (Hls.isSupported()) {
        const instance = new Hls();
        instance.on(Hls.Events.MANIFEST_PARSED, () => {
          // start at the top rendition so the first frames aren't blurry
          instance.startLevel = instance.levels.length - 1;
          startIfWanted();
        });
        // Recover once from a media hiccup; anything else fatal is a failure
        let recovered = false;
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && !recovered) {
            recovered = true;
            instance.recoverMediaError();
            return;
          }
          setFailed(true);
          instance.destroy();
          hls = null;
        });
        instance.loadSource(video.playlist);
        instance.attachMedia(el);
        hls = instance;
      } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = video.playlist;
        startIfWanted();
      } else {
        setFailed(true);
      }
    };

    // On a retry the visitor is looking right at it: attach straight away
    if (attempt > 0) {
      void attach();
      return () => {
        cancelled = true;
        hls?.destroy();
      };
    }

    const approach = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        approach.disconnect();
        void attach();
      },
      { rootMargin: "600px 0px" },
    );
    approach.observe(el);

    return () => {
      cancelled = true;
      approach.disconnect();
      hls?.destroy();
    };
    // `muted` is read once at attach time; toggling it must not re-attach
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.playlist, attempt]);

  // Autoplay while visible, pause when scrolled away
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (!entry.isIntersecting) {
          wantsPlayRef.current = false;
          el.pause();
          setWaiting(false);
        } else {
          // Scrolled in before the first frames arrived — the stream may still
          // be attaching (hls.js downloading on a slow link): show it loading.
          // A refused autoplay (e.g. iPhone Low Power Mode) clears it again.
          if (el.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) setWaiting(true);
          if (el.currentSrc || el.src) void el.play().catch(() => setWaiting(false));
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The loader shows only once a wait has lasted LOADER_DELAY
  const loading = !failed && waiting;
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoaderDue(true), LOADER_DELAY);
    return () => {
      clearTimeout(t);
      setLoaderDue(false);
    };
  }, [loading]);
  const showLoader = loading && loaderDue;

  // Track fullscreen so the toggle button works both ways. Desktop/Android
  // fire `fullscreenchange` on the document; iOS fires `webkit*fullscreen`
  // on the <video> element instead.
  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);

    const el = videoRef.current;
    const onIOSBegin = () => setIsFullscreen(true);
    const onIOSEnd = () => setIsFullscreen(false);
    el?.addEventListener("webkitbeginfullscreen", onIOSBegin);
    el?.addEventListener("webkitendfullscreen", onIOSEnd);

    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      el?.removeEventListener("webkitbeginfullscreen", onIOSBegin);
      el?.removeEventListener("webkitendfullscreen", onIOSEnd);
    };
  }, []);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el || failed) return;
    if (el.paused) {
      wantsPlayRef.current = true;
      // Not attached yet: show the loader now; MANIFEST_PARSED will start it
      if (!ready) setWaiting(true);
      void el.play().catch(() => {});
    } else {
      wantsPlayRef.current = false;
      el.pause();
    }
  };

  const retry = () => {
    setFailed(false);
    setReady(false);
    setWaiting(true);
    wantsPlayRef.current = true;
    setAttempt((n) => n + 1);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current as IOSVideo | null;

    // Already fullscreen — exit, via whichever API took us there.
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (video?.webkitDisplayingFullscreen) {
      video.webkitExitFullscreen?.();
      return;
    }

    // Standard API (desktop, Android Chrome): fullscreen the frame so our
    // custom controls stay on top of the video.
    if (frameRef.current?.requestFullscreen) {
      void frameRef.current.requestFullscreen().catch(() => {});
      return;
    }

    // iOS Safari (iPhone): the only fullscreen available is the native video
    // player. Make sure playback has begun so the call isn't ignored.
    if (video?.webkitEnterFullscreen) {
      if (video.readyState < 1) void video.play().catch(() => {});
      video.webkitEnterFullscreen();
    }
  };

  const seek = (value: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = value;
    setTime(value);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    const next = !el.muted;
    el.muted = next;
    setMuted(next);
  };

  const progress = duration > 0 ? Math.min(time / duration, 1) : 0;
  const ar = video.aspectRatio ?? { width: 16, height: 9 };
  // Same box as a feed photo: its own ratio, as wide as fits under the
  // shared height cap
  const frameWidth = Math.round((MEDIA_MAX_HEIGHT * ar.width) / ar.height);

  const chip =
    "pressable flex items-center justify-center rounded-full bg-paper/90 text-ink backdrop-blur-sm transition-colors hover:text-accent";

  const mainLabel = failed ? "Retry video" : showLoader ? "Loading video" : playing ? "Pause" : "Play";

  return (
    <div
      ref={frameRef}
      className="video-frame relative mt-4 overflow-hidden rounded-xl border border-line bg-black"
      style={{
        aspectRatio: `${ar.width} / ${ar.height}`,
        width: `min(100%, ${frameWidth}px)`,
      }}
    >
      <video
        ref={videoRef}
        poster={video.thumbnail}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        aria-label={video.alt || "Video"}
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          setWaiting(false);
        }}
        onWaiting={() => setWaiting(true)}
        onSeeking={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onSeeked={() => setWaiting(false)}
        onCanPlay={() => {
          setReady(true);
          // Paused with data in hand is not a wait (e.g. scrolled in, then
          // autoplay was blocked)
          if (videoRef.current?.paused) setWaiting(false);
        }}
        onError={() => setFailed(true)}
        onTimeUpdate={(e) => {
          const now = performance.now();
          if (now - lastTimeSyncRef.current >= 250) {
            lastTimeSyncRef.current = now;
            setTime(e.currentTarget.currentTime);
          }
        }}
        // hls.js learns the real length after the first level loads, so
        // listen for the change, not just the first metadata
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setDuration(d);
        }}
        className="block h-full w-full cursor-pointer object-cover"
      />

      {/* Failure: a quiet veil with the reason; the ring button retries */}
      {failed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55">
          <span className="rounded-full bg-paper/90 px-3 py-1.5 font-mono text-[11px] text-ink-2 backdrop-blur-sm">
            couldn't load this video
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        className={`${chip} absolute top-3 right-3 z-10 h-10 w-10`}
      >
        {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
      </button>

      {/* Seek strip: a 3px line along the bottom edge, with an invisible
          24px-tall range input over it as the touch target. A pill marks the
          position while dragging. It sits below the controls (which start
          28px up) so a tap on a button never lands on the strip. */}
      <div className="absolute inset-x-0 bottom-0 h-6">
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
          <div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} />
        </div>
        {seeking && (
          <span
            aria-hidden="true"
            className="absolute bottom-0 h-3 w-1 -translate-x-1/2 rounded-full bg-accent"
            style={{ left: `${progress * 100}%` }}
          />
        )}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          disabled={!ready || failed}
          onChange={(e) => seek(Number(e.target.value))}
          onPointerDown={() => setSeeking(true)}
          onPointerUp={() => setSeeking(false)}
          onPointerCancel={() => setSeeking(false)}
          onBlur={() => setSeeking(false)}
          aria-label="Seek"
          aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
          className="vid-seek absolute inset-0"
        />
      </div>

      {/* Play/pause wearing the progress as a ring; time reads beside it.
          While loading or buffering the ring becomes a spinning arc. */}
      <div className="absolute bottom-7 left-3 z-10 flex items-center gap-2.5">
        <button
          type="button"
          onClick={failed ? retry : togglePlay}
          aria-label={mainLabel}
          aria-busy={showLoader}
          className={`${chip} relative`}
          style={{ width: RING_SIZE, height: RING_SIZE }}
        >
          <svg
            aria-hidden="true"
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            className={`absolute inset-0 ${showLoader ? "vid-spin" : "-rotate-90"}`}
          >
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              fill="none"
              stroke="var(--line)"
              strokeWidth="3"
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              fill="none"
              stroke="var(--accent-ink)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={RING_LEN}
              // A quarter arc while loading; otherwise the elapsed share
              strokeDashoffset={showLoader ? RING_LEN * 0.75 : RING_LEN * (1 - progress)}
              // Time state syncs 4×/s; ease between syncs so the ring glides
              style={{ transition: seeking || showLoader ? "none" : "stroke-dashoffset 250ms linear" }}
            />
          </svg>
          {failed ? (
            <RotateCcw size={17} />
          ) : playing || showLoader ? (
            <Pause size={18} className={showLoader ? "opacity-40" : undefined} />
          ) : (
            <Play size={18} className="translate-x-[1px]" />
          )}
        </button>
        <span
          aria-live="polite"
          className="font-mono text-[11.5px] tabular-nums text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.7)]"
        >
          {failed ? null : showLoader && !ready ? (
            "loading…"
          ) : (
            <>
              {formatTime(time)}
              {duration > 0 && <span className="text-white/60"> / {formatTime(duration)}</span>}
            </>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className={`${chip} absolute right-3 bottom-7 z-10 h-10 w-10`}
      >
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
  );
};

export default VideoPlayer;
