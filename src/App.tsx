import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Loader from "./components/Loader";
import BlogListPage from "./pages/BlogListPage";
import HomePage from "./pages/HomePage";
import PostsPage from "./pages/PostsPage";

// Code-split the heavy bits: markdown rendering and the OAuth/admin stack.
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

const App = () => (
  <BrowserRouter>
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/blog" element={<BlogListPage />} />
          <Route path="/blog/:rkey" element={<BlogPostPage />} />
          <Route path="/posts" element={<PostsPage />} />
          {/* legacy path */}
          <Route path="/post" element={<PostsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
