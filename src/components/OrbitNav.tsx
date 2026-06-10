import { BookOpen, Home, Pencil } from "lucide-react";
import { createElement } from "react";
import { Link, useLocation } from "react-router-dom";
import profileImage from "../assets/profile.png";

const routes = [
  { path: "/", icon: Home, symbolId: "home-icon" },
  { path: "/blog", icon: BookOpen, symbolId: "blog-icon" },
  { path: "/posts", icon: Pencil, symbolId: "posts-icon" },
];

const ORBIT_PATH = "M 50,50 m -48,0 a 48,15 0 1,1 96,0 a 48,15 0 1,1 -96,0";

/** Profile picture with three orbiting nav icons — the site's signature header. */
const OrbitNav = () => {
  const { pathname } = useLocation();

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <div className="relative w-72 sm:w-80">
      <svg viewBox="-10 -10 120 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {routes.map((route) => (
            <symbol id={route.symbolId} viewBox="0 0 24 24" key={route.symbolId}>
              {createElement(route.icon, { size: 24 })}
            </symbol>
          ))}
        </defs>
        <style>
          {`
            .orbit { stroke: #3f3f46; stroke-width: 0.4; }
            .clickable-area { fill: transparent; cursor: pointer; }
            @keyframes revolve {
              from { offset-distance: 0%; }
              to { offset-distance: 100%; }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .icon-wrapper { animation: spin 10s linear infinite; }
          `}
        </style>
        {routes.map((route, index) => (
          <g key={route.path} transform={`rotate(${30 - 120 * index} 50 50)`}>
            <Link to={route.path}>
              <path d={ORBIT_PATH} className="clickable-area" />
            </Link>
            <path
              d={ORBIT_PATH}
              fill="none"
              className={
                isActive(route.path)
                  ? "stroke-blue-500 stroke-[0.5] drop-shadow-lg filter"
                  : "orbit"
              }
              pointerEvents="none"
            />
            <Link to={route.path} aria-label={route.path === "/" ? "home" : route.path.slice(1)}>
              <g
                style={{
                  offsetPath: `path('${ORBIT_PATH}')`,
                  animation: "revolve 15s linear infinite",
                  animationDelay: `${-10 * index}s`,
                }}
              >
                <g className="icon-wrapper">
                  <use
                    href={`#${route.symbolId}`}
                    width="8"
                    height="8"
                    x="-4"
                    y="-4"
                    className={
                      isActive(route.path)
                        ? "text-blue-500 drop-shadow-lg filter"
                        : "text-zinc-500"
                    }
                  />
                </g>
              </g>
            </Link>
          </g>
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-36 w-36 overflow-hidden rounded-full sm:h-[9.6rem] sm:w-[9.6rem]">
          <img
            src={profileImage}
            alt="Ankit Bhandari"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default OrbitNav;
