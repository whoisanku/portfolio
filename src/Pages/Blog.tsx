import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

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

const Blog: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
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
  }, []);

  if (loading) return <div className="text-white">Loading...</div>;
  if (error) return <div className="text-white">Error: {error}</div>;

  return (
    <div className="text-white">
      <h1 className="text-2xl font-bold mb-4">Blogs</h1>
      {posts.length > 0 ? (
        posts.map((post) => (
          <div
            key={post.PostHashHex}
            className="mb-4 p-4 border border-gray-700 rounded"
          >
            <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
            <p className="text-sm text-gray-400">
              Posted on:{" "}
              {new Date(post.TimestampNanos / 1000000).toLocaleDateString()}
            </p>
            <img src={post.ImageURLs}></img>
            <p className="mt-2">{post.content?.slice(0, 150)}...</p>
            <Link
              to={`/blog/${post.PostHashHex}`}
              className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Read More
            </Link>
          </div>
        ))
      ) : (
        <p>No blog posts found.</p>
      )}
    </div>
  );
};

export default Blog;
