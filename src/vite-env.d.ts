/// <reference types="vite/client" />

/** hls.js ships its lighter build without typings; it has the main build's API. */
declare module "hls.js/light" {
  export { default } from "hls.js";
}
