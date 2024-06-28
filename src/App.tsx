import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import BackgroundComets from "./Components/BackgroundComets";
import Profile from "./Components/Profile";

const App: React.FC = () => {
  return (
    <Router>
      <div className="App relative h-screen w-screen bg-black overflow-hidden">
        <div className="absolute inset-0 z-0">
          <BackgroundComets />
        </div>
        <div className="relative z-10 flex justify-center h-full">
          <Profile />
        </div>
        <Routes>
          <Route
            path="/"
            element={
              <p className="absolute bottom-4 left-4 text-white text-2xl z-20">
                Home
              </p>
            }
          />
          <Route
            path="/blog"
            element={
              <p className="absolute bottom-4 left-4 text-white text-2xl z-20">
                Blog
              </p>
            }
          />
          <Route
            path="/post"
            element={
              <p className="absolute bottom-4 left-4 text-white text-2xl z-20">
                Post
              </p>
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
