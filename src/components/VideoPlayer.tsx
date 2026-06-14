import Hls from "hls.js";
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FeedVideo } from "../lib/feed";

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

/**
 * Branded HLS player for Bluesky video embeds. Autoplays muted while in
 * view, pauses off-screen; custom controls follow the site's accent and
 * mono styles. The frame size is locked from the post's aspect ratio so
 * the layout never reshapes while the stream loads.
 */
const VideoPlayer = ({ video }: { video: FeedVideo }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // `timeupdate` fires ~30–60×/s; throttle React state to ~4×/s so an in-view
  // autoplaying video doesn't re-render every frame and stutter page scroll.
  const lastTimeSyncRef = useRef(0);

  // Attach the HLS stream (Safari plays m3u8 natively; others need hls.js)
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = video.playlist;
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls();
      // start at the top rendition so the first frames aren't blurry
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        hls.startLevel = hls.levels.length - 1;
      });
      hls.loadSource(video.playlist);
      hls.attachMedia(el);
      return () => hls.destroy();
    }
    el.src = video.playlist;
  }, [video.playlist]);

  // Autoplay while visible, pause when scrolled away
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
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

  const changeVolume = (value: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = value;
    el.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    const next = !el.muted;
    el.muted = next;
    setMuted(next);
    if (!next && el.volume === 0) {
      el.volume = 0.6;
      setVolume(0.6);
    }
  };

  const progressPct = duration > 0 ? (time / duration) * 100 : 0;
  const volumePct = (muted ? 0 : volume) * 100;
  const ar = video.aspectRatio ?? { width: 16, height: 9 };
  // Landscape ends where the post's thread line ends (34px = arrow + gap);
  // portrait is capped by a 480px-tall frame.
  const isWide = ar.width >= ar.height;
  const frameWidth = Math.round((480 * ar.width) / ar.height);

  return (
    <div
      ref={frameRef}
      className="video-frame group/video relative mt-4 overflow-hidden rounded-xl border border-line bg-black"
      style={{
        aspectRatio: `${ar.width} / ${ar.height}`,
        width: isWide ? "calc(100% - 34px)" : `min(100%, ${frameWidth}px)`,
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
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const now = performance.now();
          if (now - lastTimeSyncRef.current >= 250) {
            lastTimeSyncRef.current = now;
            setTime(e.currentTarget.currentTime);
          }
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        className="block h-full w-full cursor-pointer object-cover"
      />

      {/* Big play affordance — reads as a video even before the stream loads */}
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play video"
          className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white transition-transform hover:scale-105"
        >
          <Play size={20} className="translate-x-[1.5px]" />
        </button>
      )}

      {/* Controls — overlay rises on hover (always shown while paused) */}
      <div
        className={`absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pt-8 pb-2 transition-opacity duration-200 ${
          playing ? "opacity-0 group-hover/video:opacity-100 focus-within:opacity-100" : "opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="shrink-0 text-white/90 transition-colors hover:text-accent"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-white/80">
          {formatTime(time)} / {formatTime(duration)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          className="vid-range min-w-0 flex-1"
          style={{
            background: `linear-gradient(to right, var(--accent-ink) ${progressPct}%, rgba(255,255,255,0.25) ${progressPct}%)`,
          }}
        />

        {/* Volume — vertical slider pops above the speaker */}
        <span className="group/vol relative flex shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="text-white/90 transition-colors hover:text-accent"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <span className="absolute bottom-full left-1/2 hidden -translate-x-1/2 pb-2 group-hover/vol:block group-focus-within/vol:block">
            <span className="flex items-center justify-center rounded-full border border-white/15 bg-black/75 px-2 py-2.5 backdrop-blur-sm">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                aria-label="Volume"
                className="vid-range-vertical"
                style={{
                  background: `linear-gradient(to top, var(--accent-ink) ${volumePct}%, rgba(255,255,255,0.25) ${volumePct}%)`,
                }}
              />
            </span>
          </span>
        </span>

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="shrink-0 text-white/90 transition-colors hover:text-accent"
        >
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>
      </div>
    </div>
  );
};

export default VideoPlayer;
