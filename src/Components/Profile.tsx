import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, PenTool } from "lucide-react";
import profileImage from "../assets/profile.png";

const Profile: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<number>(0);

  const routes = [
    { path: "/", icon: Home },
    { path: "/blog", icon: BookOpen },
    { path: "/post", icon: PenTool },
  ];

  const findActiveTabIndex = (path: string): number => {
    return routes.findIndex((route) => route.path === path);
  };

  useEffect(() => {
    const activeIndex = findActiveTabIndex(location.pathname);
    if (activeIndex !== -1) {
      setActiveTab(activeIndex);
    }
  }, [location.pathname]);

  const getIconClass = (index: number): string => {
    return index === activeTab
      ? "text-blue-500 filter drop-shadow-lg"
      : "text-gray-500";
  };

  const handleClick = (index: number) => {
    setActiveTab(index);
    console.log("clicked", index);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    console.log("Image clicked");
  };

  return (
    <div className="relative w-80 h-80">
      <svg viewBox="-10 -10 120 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <style>
          {`
            .orbit { stroke: gray; stroke-width: 0.4; }
            .clickable-area { fill: transparent; cursor: pointer; }
          `}
        </style>
        {routes.map((route, index) => (
          <g key={index} transform={`rotate(${30 - 60 * index} 50 50)`}>
            <Link to={route.path}>
              <path
                d="M 50,50 m -48,0 a 47,15 0 0,1 96,0 a 40,15 0 1,1 -96,0"
                className="clickable-area"
                onClick={() => handleClick(index)}
              />
            </Link>
            <path
              id={`orbit${index}`}
              d="M 50,50 m -47,0 a 40,15 0 1,1 96,0 a 41,14.5 0 1,1 -96,0"
              fill="none"
              className={
                location.pathname === route.path
                  ? "stroke-blue-500 filter drop-shadow-lg"
                  : "orbit"
              }
              pointerEvents="none"
            />
            <Link to={route.path}>
              <g pointerEvents="none">
                <animateMotion
                  dur="10s"
                  repeatCount="indefinite"
                  begin={`${-3.3 * index}s`}
                >
                  <mpath href={`#orbit${index}`} />
                </animateMotion>
                <g transform="translate(-4, -4)">
                  {React.createElement(route.icon, {
                    size: 8,
                    className: getIconClass(index),
                  })}
                </g>
              </g>
            </Link>
          </g>
        ))}
      </svg>

      {/* Profile image */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-40 h-40 rounded-full overflow-hidden"
          style={{
            clipPath: "circle(50%)",
            pointerEvents: "auto",
          }}
          onClick={handleImageClick}
        >
          <img
            src={profileImage}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;
