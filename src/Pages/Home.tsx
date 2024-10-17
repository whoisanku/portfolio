import React, { useState, useEffect } from "react";
import { FaGithub, FaExternalLinkAlt } from "react-icons/fa";
import connectsky_img from "../assets/connectsky.png";
import waverly_img from "../assets/waverly.png";

interface Link {
  type: "github" | "external";
  url: string;
}

interface WorkExperience {
  id: number;
  company: string;
  description: string;
  technologies: string[];
  imageUrl: string;
  links: Link[];
}

const workExperiences: WorkExperience[] = [
  {
    id: 1,
    company: "Connectsky",
    description:
      "Developed a chrome extension for social protocol named ATProtocol. Mostly focused on frontend side, APIs, along with the extension's side of message passing & service workers.",
    technologies: ["React", "TypeScript", "Tailwind CSS"],
    imageUrl: connectsky_img,
    links: [
      { type: "github", url: "https://github.com/Nester-xyz/Connectsky" },
    ],
  },
  {
    id: 2,
    company: "Waverly",
    description:
      "Implemented chrome extension features like service workers & message passing for background service jobs. Designed the interface and frontend. Also, helped to bundle the code using webpack bundler.",
    technologies: ["React", "Javascript", "Tailwind CSS"],
    imageUrl: waverly_img,
    links: [{ type: "github", url: "https://github.com/waverly" }],
  },
];

const Home: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number>(workExperiences[0].id);
  const [width, setWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  const isMobile = width < 768;

  const selectedExperience = workExperiences.find(
    (exp) => exp.id === selectedId
  );

  const currentIndex = workExperiences.findIndex(
    (exp) => exp.id === selectedId
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const handleNext = () => {
    if (currentIndex < workExperiences.length - 1) {
      setSelectedId(workExperiences[currentIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedId(workExperiences[currentIndex - 1].id);
    }
  };

  const buttonWidth = 160;
  const buttonGap = 20;
  const containerWidth = 250;

  const totalWidth = workExperiences.length * (buttonWidth + buttonGap);
  const maxTranslateX = totalWidth - containerWidth;

  let desiredTranslateX =
    currentIndex * (buttonWidth + buttonGap) -
    (containerWidth - buttonWidth) / 2;

  desiredTranslateX = Math.max(0, Math.min(desiredTranslateX, maxTranslateX));

  return (
    <div className="text-white flex flex-col items-center p-4">
      <h1 className="text-3xl font-semibold mb-8">Project Showcase</h1>

      <div className="flex w-full flex-col md:flex-row">
        {/* Left Side - Placeholder */}
        <div className="w-full md:w-1/6 hidden md:block"></div>

        {/* Middle Side - Buttons */}
        <div
          className={`w-full md:w-1/6 ${
            isMobile
              ? "flex justify-center items-center mb-4 md:mb-0"
              : "flex flex-col justify-start items-center"
          }`}
        >
          {isMobile ? (
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 flex items-center justify-center">
                {currentIndex > 0 ? (
                  <button
                    onClick={handlePrev}
                    className="p-2 bg-gray-700 rounded-full hover:bg-gray-600"
                    aria-label="Previous Work Experience"
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                ) : (
                  <div className="w-6 h-6"></div>
                )}
              </div>

              <div
                className="relative w-[250px] overflow-hidden"
                style={{ flex: "0 0 auto" }}
              >
                <div
                  className="flex items-center transition-transform duration-500"
                  style={{
                    transform: `translateX(-${desiredTranslateX}px)`,
                  }}
                >
                  {workExperiences.map((exp) => {
                    const isActive = exp.id === selectedId;
                    return (
                      <button
                        key={exp.id}
                        onClick={() => setSelectedId(exp.id)}
                        className={`flex-shrink-0 py-2 rounded-md text-center  text-white mx-2 transform transition-all duration-300 ${
                          isActive
                            ? "scale-100 opacity-100 z-10 bg-blue-500"
                            : "scale-90 opacity-70 z-5 bg-gray-500"
                        }`}
                        style={{
                          width: `${buttonWidth}px`,
                        }}
                      >
                        {exp.company}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="w-10 h-10 flex items-center justify-center">
                {currentIndex < workExperiences.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="p-2 bg-gray-700 rounded-full hover:bg-gray-600"
                    aria-label="Next Work Experience"
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ) : (
                  <div className="w-6 h-6"></div>
                )}
              </div>
            </div>
          ) : (
            workExperiences.map((exp) => (
              <button
                key={exp.id}
                onClick={() => setSelectedId(exp.id)}
                className={`w-36 mt-4 py-2 rounded-xl transition-colors duration-300 ${
                  exp.id === selectedId
                    ? "bg-blue-500 text-white"
                    : "text-gray-300 hover:bg-gray-600"
                }`}
              >
                {exp.company}
              </button>
            ))
          )}
        </div>

        {/* Right Side - Content */}
        <div className={`w-full md:w-4/6 flex ${isMobile ? "" : "pl-8"}`}>
          {selectedExperience && (
            <div
              key={selectedId}
              className={`p-4 rounded-lg shadow-lg w-full max-w-3xl transition-opacity duration-500 opacity-0 animate-fadeIn`}
            >
              <div className="mb-4">
                <img
                  src={selectedExperience.imageUrl}
                  alt={`${selectedExperience.company} image`}
                  className="w-full h-auto rounded"
                />
              </div>
              <div className="text-gray-300 mb-4">
                {selectedExperience.description}
              </div>

              <div className="flex space-x-4 mb-4">
                {selectedExperience.links.map((link, index) => {
                  if (link.type === "github") {
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-blue-400"
                        aria-label="GitHub Link"
                      >
                        <FaGithub size={24} />
                      </a>
                    );
                  } else if (link.type === "external") {
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-blue-400"
                        aria-label="External Link"
                      >
                        <FaExternalLinkAlt size={24} />
                      </a>
                    );
                  }
                  return null;
                })}
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">
                  Technologies Used:
                </h3>
                <ul className="list-disc list-inside text-gray-300">
                  {selectedExperience.technologies.map((tech, index) => (
                    <li key={index}>{tech}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Home;
