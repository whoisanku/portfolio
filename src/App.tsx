import { QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion } from "motion/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { DialogProvider } from "./components/DialogProvider";
import Layout from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import { queryClient } from "./lib/queries";
import BlogListPage from "./pages/BlogListPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import OAuthCallback from "./pages/OAuthCallback";
import PostsPage from "./pages/PostsPage";
import { BlogPostPage } from "./routes";

/**
 * Components animate through Motion's lightweight `m` elements; the engine
 * behind them (~30 KB gzipped) loads just after first paint instead of
 * holding it up. `strict` catches any full `motion.*` import sneaking back.
 */
const loadMotionFeatures = () => import("./lib/motionFeatures").then((mod) => mod.default);

/*
 * Pages load inside Layout's own <Suspense>, so the header and footer stay
 * up while the (lazy) post page arrives. Navigations run as transitions:
 * the current page stays on screen until the next one is ready.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <LazyMotion features={loadMotionFeatures} strict>
      <BrowserRouter>
        <ToastProvider>
          <DialogProvider>
            <AuthProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/blog" element={<BlogListPage />} />
                  <Route path="/blog/:rkey" element={<BlogPostPage />} />
                  <Route path="/posts" element={<PostsPage />} />
                  {/* legacy path */}
                  <Route path="/post" element={<PostsPage />} />
                  <Route path="/oauth/callback" element={<OAuthCallback />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </AuthProvider>
          </DialogProvider>
        </ToastProvider>
      </BrowserRouter>
    </LazyMotion>
  </QueryClientProvider>
);

export default App;
