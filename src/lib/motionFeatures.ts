/**
 * Motion's animation engine, loaded right after first paint (see App.tsx).
 * domMax includes layout animations, which the toasts' reflow and the
 * editor's visibility pill need.
 */
import { domMax } from "motion/react";

export default domMax;
