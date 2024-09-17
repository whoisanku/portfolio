import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import BackgroundComets from "./Components/BackgroundComets";
import Profile from "./Components/Profile";
import Blog from "./Pages/Blog";
import BlogPost from "./Pages/BlogPost";
import Home from "./Pages/Home";
import AnimatedSign from "./Components/AnimatedSign";
// import { FaXTwitter } from "react-icons/fa6";
import { Providers } from "./Providers";
import { UsePublications } from "./Pages/Post";
import blueskyLogo from "./assets/bsky.svg";

interface PostExtraData {
  BlogDeltaRtfFormat: string;
  BlogTitleSlug: string;
  Title: string;
}

interface Post {
  PostHashHex: string;
  ImageURLs: string;
  Body: string;
  TimestampNanos: number;
  PostExtraData?: PostExtraData;
  title?: string;
  content?: string;
}

const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  return (
    <Providers>
      <Router>
        <div className="App relative min-h-screen w-screen bg-black overflow-x-hidden">
          <div className="absolute inset-0 z-0">
            <BackgroundComets />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <Profile />
            <div className="w-full max-w-4xl px-4">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route
                  path="/blog"
                  element={
                    <div>
                      <div className="text-white text-2xl flex justify-center mb-6">
                        Blogs
                      </div>
                      <Blog posts={posts} setPosts={setPosts} />
                    </div>
                  }
                />
                <Route
                  path="/blog/:postId"
                  element={<BlogPost posts={posts} />}
                />
                <Route
                  path="/post"
                  element={
                    <div>
                      <div className="text-white text-2xl flex justify-center mb-6">
                        Posts
                      </div>
                      <UsePublications />
                    </div>
                  }
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
                <div className="text-white text-xl mt-2 flex items-center gap-4">
                  {/* <a
                    href="https://twitter.com/whoisanku"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <FaXTwitter className="w-6 h-6 hover:opacity-100 transition-opacity" />
                  </a> */}
                  <a
                    href="https://bsky.app/profile/anku.bsky.social"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <img
                      src={blueskyLogo}
                      alt="Bluesky"
                      className="w-6.5 h-6 hover:opacity-100 transition-opacity"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Router>
    </Providers>
  );
};

export default App;
