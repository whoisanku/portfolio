import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MoonLoader from "./MoonLoader";

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

interface ApiResponse {
  Posts: Post[];
}

const BlogPostCard: React.FC<{ post: Post }> = ({ post }) => {
  return (
    <article className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
      <div className="text-gray-400 text-sm mb-2">
        Posted on:{" "}
        {new Date(post.TimestampNanos / 1000000).toLocaleDateString()}
      </div>
      <h2 className="text-xl font-semibold mb-2 text-white">{post.title}</h2>
      {post.ImageURLs && (
        <img
          src={post.ImageURLs}
          alt={post.title}
          className="w-full h-auto rounded-lg mb-4"
        />
      )}
      <p className="text-white mb-4">{post.content?.slice(0, 150)}...</p>
      <Link
        to={`/blog/${post.PostHashHex}`}
        className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Read More
      </Link>
    </article>
  );
};

const Blog: React.FC<{
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
}> = ({ posts, setPosts }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      const url = "https://node.deso.org/api/v0/get-posts-for-public-key";
      const data = {
        PublicKeyBase58Check:
          "BC1YLfuFqiNB2wMPoMN8qiaYnW4PcXEgMd2orvXr1cUkXjCSgmiJpJU",
        NumToFetch: 50,
      };

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const result: ApiResponse = await response.json();

        // Filter to include only blog posts and process them
        const blogPosts = result.Posts.filter(
          (post) => post.PostExtraData?.BlogDeltaRtfFormat
        ).map((post) => {
          if (post.PostExtraData) {
            const blogContent = JSON.parse(
              post.PostExtraData.BlogDeltaRtfFormat
            );
            const content = blogContent.ops
              ? blogContent.ops
                  .map((op: any) => op.insert)
                  .join("")
                  .trim()
              : "";
            return {
              ...post,
              title:
                post.PostExtraData.Title ||
                post.PostExtraData.BlogTitleSlug ||
                "Untitled",
              content: content,
            };
          }
          return post;
        });

        setPosts(blogPosts);
        setLoading(false);
      } catch (err) {
        setError(
          `Failed to fetch posts: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
        setLoading(false);
      }
    };

    fetchPosts();
  }, [setPosts]);

  if (loading)
    return (
      <div className="text-white text-center">
        <MoonLoader size={40} />
      </div>
    );
  if (error)
    return <div className="text-white text-center">Error: {error}</div>;

  return (
    <div>
      <div className="py-1">
        <div className="max-w-2xl mx-auto px-4">
          {posts.length > 0 ? (
            posts.map((post) => (
              <BlogPostCard key={post.PostHashHex} post={post} />
            ))
          ) : (
            <p className="text-white text-center">No blog posts found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Blog;
