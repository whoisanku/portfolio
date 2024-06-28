import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import BackgroundComets from "./Components/BackgroundComets";
import Profile from "./Components/Profile";
import Blog from "./Pages/Blog";
import BlogPost from "./Pages/BlogPost";

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
              <Route
                path="/"
                element={<p className="text-white text-2xl">Home</p>}
              />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:postHashHex" element={<BlogPost />} />
              <Route
                path="/post"
                element={<p className="text-white text-2xl">Post</p>}
              />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
};

export default App;
