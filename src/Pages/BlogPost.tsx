import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react"; // Make sure you have lucide-react installed

interface Post {
  PostHashHex: string;
  ImageURLs: string;
  Body: string;
  TimestampNanos: number;
  PostExtraData?: {
    BlogDeltaRtfFormat: string;
    BlogTitleSlug: string;
    Title: string;
  };
  title?: string;
  content?: string;
}

const BlogPost: React.FC = () => {
  const { postHashHex } = useParams<{ postHashHex: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      const url = "https://node.deso.org/api/v0/get-single-post";
      const data = {
        PostHashHex: postHashHex,
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

        const result = await response.json();
        const postData = result.PostFound;

        if (postData.PostExtraData?.BlogDeltaRtfFormat) {
          const blogContent = JSON.parse(
            postData.PostExtraData.BlogDeltaRtfFormat
          );
          const content = blogContent.ops
            ? blogContent.ops
                .map((op: any) => op.insert)
                .join("")
                .trim()
            : "";
          postData.title =
            postData.PostExtraData.Title ||
            postData.PostExtraData.BlogTitleSlug ||
            "Untitled";
          postData.content = content;
        }

        setPost(postData);
        setLoading(false);
      } catch (err) {
        setError(
          `Failed to fetch post: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
        setLoading(false);
      }
    };

    if (postHashHex) {
      fetchPost();
    }
  }, [postHashHex]);

  const handleBack = () => {
    navigate("/blog");
  };

  if (loading) return <div className="text-white">Loading...</div>;
  if (error) return <div className="text-white">Error: {error}</div>;
  if (!post) return <div className="text-white">Post not found</div>;

  return (
    <div className="text-white">
      <button
        onClick={handleBack}
        className="mb-4 flex items-center text-blue-500 hover:text-blue-600"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Blogs
      </button>
      <img src={post.ImageURLs}></img>
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-sm text-gray-400 mb-4">
        Posted on:{" "}
        {new Date(post.TimestampNanos / 1000000).toLocaleDateString()}
      </p>
      <div className="mt-4 whitespace-pre-wrap">{post.content}</div>
    </div>
  );
};

export default BlogPost;
