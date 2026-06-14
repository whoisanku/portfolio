import { lazy, Suspense } from "react";
import { matchPath } from "react-router-dom";
import { readAuthReturnPath } from "../auth/oauthState";
import BlogListPage from "./BlogListPage";
import HomePage from "./HomePage";
import PostsPage from "./PostsPage";

const BlogPostPage = lazy(() => import("./BlogPostPage"));

const pathnameFromReturnPath = (path: string) => {
  try {
    return new URL(path, window.location.origin).pathname;
  } catch {
    return "/";
  }
};

/**
 * The OAuth client consumes the callback URL from AuthContext. While that runs,
 * keep the visible page on the route that launched OAuth instead of swapping to
 * a full-page loader.
 */
const OAuthCallback = () => {
  const pathname = pathnameFromReturnPath(readAuthReturnPath());
  const blogPostMatch = matchPath(
    { path: "/blog/:rkey", end: true },
    pathname,
  );

  if (blogPostMatch?.params.rkey) {
    return (
      <Suspense fallback={<BlogListPage />}>
        <BlogPostPage rkey={blogPostMatch.params.rkey} />
      </Suspense>
    );
  }

  if (pathname === "/blog") return <BlogListPage />;
  if (pathname === "/posts" || pathname === "/post") return <PostsPage />;

  return <HomePage />;
};

export default OAuthCallback;
