/**
 * The site's hand-rolled glides (the avatar's hero ↔ topbar move, the nav
 * underline) run as Web Animations on `transform` alone. The browser hands
 * those to the compositor, so they stay smooth on a slow phone even while the
 * next page is still rendering on the main thread — exactly when a
 * JS-driven animation (one frame computed in script at a time) would stall.
 *
 * They move on a spring, as Motion's layout animations do: off the mark
 * gently, into place with a hint of overshoot, and a glide cut short by
 * another carries its speed into it instead of stopping dead. Motion steps
 * its spring in script every frame; here it's solved up front and handed
 * over as keyframes. (Not as a `linear()` easing: Safari won't run an
 * animation with one on its compositor.)
 */

/** Motion's spring options (mass 1): just short of critically damped. */
const STIFFNESS = 380;
const DAMPING = 30;
/** Close enough to rest to stop, in px. */
const REST = 0.2;
/** Keyframes per second: fine enough that straight lines between them read as the curve. */
const SAMPLE_RATE = 120;

/** How fast the swing dies away (1/s), and how fast it swings (rad/s). */
const DECAY = DAMPING / 2;
const FREQ = Math.sqrt(STIFFNESS - DECAY * DECAY);

/** One number a glide moves, setting off at `velocity` (per second). */
export interface Axis {
  from: number;
  to: number;
  velocity?: number;
}

/** Where a gliding number is, and how fast it's moving (per second). */
export interface AxisState {
  value: number;
  velocity: number;
}

export interface Glide<K extends string> {
  /** Each number as it is on screen right now; null once the glide is over. */
  now(): Record<K, AxisState> | null;
  cancel(): void;
}

/** The damped spring, solved in closed form for one axis. */
function solve({ from, to, velocity = 0 }: Axis) {
  const x0 = from - to;
  const b = (velocity + DECAY * x0) / FREQ;
  return {
    /** Seconds until it's within REST of `to` for good. */
    settle: Math.max(0, Math.log(Math.hypot(x0, b) / REST) / DECAY),
    at(t: number): AxisState {
      const fade = Math.exp(-DECAY * t);
      const cos = Math.cos(FREQ * t);
      const sin = Math.sin(FREQ * t);
      return {
        value: to + fade * (x0 * cos + b * sin),
        velocity: fade * (velocity * cos - (DECAY * b + FREQ * x0) * sin),
      };
    },
  };
}

/**
 * Glides `el` while each of `axes` springs from `from` to `to`, drawing it
 * at `transform(values)` along the way. The element's own style should
 * already be the end state; the glide lands exactly on it.
 */
export function glide<K extends string>(
  el: HTMLElement,
  axes: Record<K, Axis>,
  transform: (values: Record<K, number>) => string,
): Glide<K> {
  const keys = Object.keys(axes) as K[];
  const springs = keys.map((key) => solve(axes[key]));
  const duration = Math.max(...springs.map((spring) => spring.settle));

  const steps = Math.max(1, Math.ceil(duration * SAMPLE_RATE));
  const keyframes: Keyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const values = {} as Record<K, number>;
    keys.forEach((key, k) => {
      values[key] = i === steps ? axes[key].to : springs[k].at((i / steps) * duration).value;
    });
    keyframes.push({ transform: transform(values) });
  }
  const animation = el.animate(keyframes, { duration: duration * 1000 });

  return {
    now() {
      if (animation.playState !== "running") return null;
      const t = Number(animation.currentTime ?? 0) / 1000;
      const state = {} as Record<K, AxisState>;
      keys.forEach((key, k) => {
        state[key] = springs[k].at(t);
      });
      return state;
    },
    cancel: () => animation.cancel(),
  };
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
