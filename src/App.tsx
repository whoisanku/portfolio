import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import Layout from "./components/Layout";
import Loader from "./components/Loader";
import { ToastProvider } from "./components/Toast";
import { DialogProvider } from "./components/DialogProvider";
import BlogListPage from "./pages/BlogListPage";
import HomePage from "./pages/HomePage";
import OAuthCallback from "./pages/OAuthCallback";
import PostsPage from "./pages/PostsPage";

// Code-split the heavy markdown rendering route.
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));

const App = () => (
  <BrowserRouter>
    <ToastProvider>
      <DialogProvider>
        <AuthProvider>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/blog" element={<BlogListPage />} />
                <Route path="/blog/:rkey" element={<BlogPostPage />} />
                <Route path="/posts" element={<PostsPage />} />
                {/* legacy path */}
                <Route path="/post" element={<PostsPage />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </DialogProvider>
    </ToastProvider>
  </BrowserRouter>
);

export default App;
