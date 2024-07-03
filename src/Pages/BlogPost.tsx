import { ChevronLeft } from "lucide-react";
import React from "react";
import { useParams, Link } from "react-router-dom";

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

const BlogPost: React.FC<{ posts: Post[] }> = ({ posts }) => {
  const { postId } = useParams<{ postId: string }>();
  const post = posts.find((p) => p.PostHashHex === postId);

  if (!post) {
    return <div className="text-white text-center">Post not found.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 ">
      <Link
        to="/blog"
        className="flex items-center justify-center w-20 mx-6 py-2  bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        <ChevronLeft /> Back
      </Link>
      <article className="rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-semibold text-white">{post.title}</h1>
        <div className="text-gray-400 text-sm mb-4">
          Posted on:{" "}
          {new Date(post.TimestampNanos / 1000000).toLocaleDateString()}
        </div>

        {post.ImageURLs && (
          <img
            src={post.ImageURLs}
            alt={post.title}
            className="w-full h-auto rounded-lg mb-4"
          />
        )}
        <div className="text-white mb-4">{post.content}</div>
      </article>
    </div>
  );
};

export default BlogPost;
