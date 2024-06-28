import { memo } from "react";
import { motion } from "framer-motion";

const paths = [
  "M-366 -205C-366 -205 -298 200 166 327C630 454 698 859 698 859",
  "M-254 -333C-254 -333 -186 72 278 199C742 326 810 731 810 731",
  "M-142 -461C-142 -461 -74 -56 390 71C861 190 929 595 929 595",
  "M-86 -525C-86 -525 -18 -120 446 7C917 126 985 531 985 531",
];

const BackgroundComets = () => {
  return (
    <div className="absolute -z-10 inset-0 flex h-full w-full items-center justify-center [mask-repeat:no-repeat] [mask-size:40px]">
      <svg
        className="pointer-events-none absolute z-0 h-full w-full"
        width="100%"
        height="100%"
        viewBox="0 0 696 316"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {paths.map((path, index) => (
          <motion.path
            key={index}
            d={path}
            stroke={`url(#linearGradient-${index})`}
            strokeOpacity="0.6"
            strokeWidth="0.8"
          />
        ))}
        <defs>
          {paths.map((_path, index) => (
            <motion.linearGradient
              id={`linearGradient-${index}`}
              x1="100%"
              x2="100%"
              y1="100%"
              y2="100%"
              key={`gradient-${index}`}
              animate={{
                x1: ["0%", "100%"],
                x2: ["0%", "95%"],
                y1: ["0%", "100%"],
                y2: ["0%", `${93 + Math.random() * 8}%`],
              }}
              transition={{
                duration: Math.random() * 10 + 15,
                ease: "easeOut",
                repeat: Infinity,
                delay: Math.random() * 10,
              }}
            >
              <stop stopColor="#1E90FF" stopOpacity="0"></stop>
              <stop offset="0.1" stopColor="#1E90FF"></stop>
              <stop offset="50%" stopColor="#00BFFF"></stop>
              <stop offset="100%" stopColor="#00BFFF" stopOpacity="0"></stop>
            </motion.linearGradient>
          ))}
          <radialGradient
            id="paint0_radial_242_278"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(352 34) rotate(90) scale(555 1560.62)"
          >
            <stop offset="0.0666667" stopColor="var(--neutral-300)"></stop>
            <stop offset="0.243243" stopColor="var(--neutral-300)"></stop>
            <stop offset="0.43594" stopColor="white" stopOpacity="0"></stop>
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

export default memo(BackgroundComets);
