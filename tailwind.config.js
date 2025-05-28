/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        starTwinkle: "starTwinkle var(--tw-animation-duration, 2s) ease-in-out infinite var(--tw-animation-delay, 0s)",
        nebula: "nebula 15s infinite ease-in-out",
      },
      keyframes: {
        starTwinkle: {
          "0%, 100%": { opacity: "0.1", transform: "scale(0.8)" },
          "50%": { opacity: "0.9", transform: "scale(1.2)" },
        },
        nebula: {
          "0%, 100%": { opacity: "0.2", backgroundPosition: "0% 0%" }, // Slightly reduced opacity
          "50%": { opacity: "0.5", backgroundPosition: "100% 100%" }, // Slightly reduced opacity
        },
      },
    },
  },
  plugins: [],
}
