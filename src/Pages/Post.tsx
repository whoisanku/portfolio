import React, { useState, useEffect, useCallback } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import MoonLoader from "./MoonLoader";

interface PublicationsProps {
  handle: string;
}

interface ImageType {
  fullsize: string;
  thumb: string;
  alt?: string;
}

interface ImageEmbed {
  $type: string;
  images: {
    alt?: string;
    aspectRatio: { height: number; width: number };
    image: {
      type: string;
      ref: { $link: string };
      mimeType: string;
      size: number;
    };
  }[];
}

interface Post {
  cid: string;
  uri: string;
  author: {
    did: string;
    handle: string;
    displayName: string;
  };
  record: {
    text: string;
    embed?: ImageEmbed;
  };
  embed?: {
    $type: string;
    images: ImageType[];
  };
  indexedAt: string;
  likeCount: number;
  repostCount: number;
}

const Publications: React.FC<PublicationsProps> = ({ handle }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchPosts = useCallback(
    async (newCursor?: string | null) => {
      setIsLoading(true);
      setError(null);
      try {
        let fetchedPosts: Post[] = [];
        let currentCursor: string | null = newCursor ?? null;
        let continueFetching = true;

        while (fetchedPosts.length < 10 && continueFetching) {
          const response = await fetch(
            `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${handle}&limit=20${
              currentCursor ? `&cursor=${currentCursor}` : ""
            }`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log(data);

          const validPosts: Post[] = data.feed
            .filter((item: any) => !item.reply && !item.reason && item.post)
            .map((item: any) => ({
              ...item.post,
              embed: item.post.embed,
            }));

          fetchedPosts = fetchedPosts.concat(validPosts);

          currentCursor = data.cursor ?? null;
          const allHaveRepliesOrReasons = data.feed.every(
            (item: any) => item.reply || item.reason
          );

          if (!currentCursor || allHaveRepliesOrReasons) {
            continueFetching = false;
          }
        }

        setPosts((prevPosts) => {
          const uniquePosts = [...prevPosts];
          fetchedPosts.forEach((newPost) => {
            if (
              !uniquePosts.some(
                (existingPost) => existingPost.cid === newPost.cid
              )
            ) {
              uniquePosts.push(newPost);
            }
          });
          return uniquePosts.slice(0, uniquePosts.length);
        });

        setCursor(currentCursor);
        setHasMore(!!currentCursor);
      } catch (err) {
        setError("Failed to fetch posts");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    [handle]
  );

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const loadMore = () => {
    if (!isLoading && cursor) {
      fetchPosts(cursor);
    }
  };

  const openImage = (src: string) => {
    setSelectedImage(src);
    document.body.style.overflow = "hidden"; // Prevent background scrolling
  };

  const closeImage = () => {
    setSelectedImage(null);
    document.body.style.overflow = "auto"; // Restore scrolling
  };

  return (
    <div className="py-4">
      <div className="max-w-2xl mx-auto px-4">
        {error && <div className="text-red-500 p-6 mb-4">{error}</div>}
        <InfiniteScroll
          dataLength={posts.length}
          next={loadMore}
          hasMore={hasMore}
          loader={
            <div className="text-white text-center">
              <MoonLoader size={40} />
            </div>
          }
          endMessage={
            <div className="text-white text-center">No more posts to load.</div>
          }
        >
          {posts.map((post, index) => (
            <div
              key={`${post.cid}-${index}`}
              className="bg-gray-800 rounded-lg shadow-lg p-4 mb-6"
            >
              <div className="text-gray-400 text-sm mb-2">
                {post.author.displayName} (@{post.author.handle})
              </div>
              <div className="mb-2">
                <p className="text-white mb-2 whitespace-pre-wrap">
                  {post.record.text}
                </p>
                {post.embed?.images && post.embed.images.length > 0 && (
                  <img
                    src={post.embed.images[0].fullsize}
                    alt={post.embed.images[0].alt || "Post image"}
                    className="w-72 object-contain rounded-lg  cursor-pointer"
                    onClick={() =>
                      post.embed?.images &&
                      openImage(post.embed.images[0].fullsize)
                    }
                  />
                )}
              </div>
              <div className="text-gray-400 text-sm flex">
                <span className="mr-4">Likes: {post.likeCount}</span>
                <span>Reposts: {post.repostCount}</span>
              </div>
            </div>
          ))}
        </InfiniteScroll>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          onClick={closeImage}
        >
          <img
            src={selectedImage}
            alt="Full Screen"
            className="w-96 h-96 object-contain rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Publications;
