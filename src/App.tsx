import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import BackgroundComets from "./Components/BackgroundComets";
import Profile from "./Components/Profile";
import Blog from "./Pages/Blog";
import BlogPost from "./Pages/BlogPost";
import Home from "./Pages/Home";
import AnimatedSign from "./Components/AnimatedSign";
import { FaXTwitter } from "react-icons/fa6";
import { FaInstagram } from "react-icons/fa";

const App: React.FC = () => {
  return (
    <Router>
      <div className="App relative min-h-screen w-screen bg-black overflow-x-hidden">
        <div className="absolute inset-0 z-0">
          <BackgroundComets />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <Profile />
          <div className="w-full max-w-4xl px-4 mt-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:postHashHex" element={<BlogPost />} />
              <Route
                path="/post"
                element={<p className="text-white text-2xl">Post</p>}
              />
            </Routes>
          </div>

          {/* Combined AnimatedSign and text with minimal spacing */}
          <div className="flex flex-col items-center mt-4 pb-7">
            <div className="w-48">
              <AnimatedSign />
            </div>
            <div className="flex items-center flex-col">
              <p className="text-white text-xl -mt-6">
                I love product designing & AI!
              </p>
              <div className="text-white text-xl mt-2 flex gap-6 opacity-75">
                <FaXTwitter />
                <FaInstagram />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App;
