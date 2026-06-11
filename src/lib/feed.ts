import { PUBLIC_API } from "./config";

export interface FeedImage {
  thumb: string;
  fullsize: string;
  alt?: string;
}

export interface FeedExternal {
  uri: string;
  title?: string;
  description?: string;
  thumb?: string;
}

export interface FeedAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface FeedPost {
  uri: string;
  cid: string;
  author: FeedAuthor;
  text: string;
  createdAt: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  images: FeedImage[];
  external?: FeedExternal;
}

interface AuthorFeedResponse {
  cursor?: string;
  feed: {
    reason?: unknown;
    reply?: unknown;
    post: {
      uri: string;
      cid: string;
      author: {
        did: string;
        handle: string;
        displayName?: string;
        avatar?: string;
      };
      record: { text?: string; createdAt?: string };
      embed?: {
        $type: string;
        images?: FeedImage[];
        external?: FeedExternal;
        media?: { $type: string; images?: FeedImage[]; external?: FeedExternal };
      };
      indexedAt: string;
      likeCount?: number;
      repostCount?: number;
      replyCount?: number;
    };
  }[];
}

function extractEmbeds(embed: AuthorFeedResponse["feed"][number]["post"]["embed"]): {
  images: FeedImage[];
  external?: FeedExternal;
} {
  if (!embed) return { images: [] };
  // recordWithMedia nests the media one level deeper
  const media = embed.media ?? embed;
  return { images: media.images ?? [], external: media.external };
}

/**
 * Fetch one page of the owner's original posts (replies and reposts
 * filtered out) from the public AppView. No auth required.
 */
export async function fetchAuthorPosts(
  handle: string,
  cursor?: string,
): Promise<{ posts: FeedPost[]; cursor?: string }> {
  const params = new URLSearchParams({
    actor: handle,
    limit: "30",
    filter: "posts_no_replies",
  });
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${PUBLIC_API}/xrpc/app.bsky.feed.getAuthorFeed?${params}`);
  if (!res.ok) throw new Error(`Failed to load feed (${res.status})`);
  const data = (await res.json()) as AuthorFeedResponse;

  const posts = data.feed
    .filter((item) => !item.reason && !item.reply)
    .map(({ post }) => {
      const { images, external } = extractEmbeds(post.embed);
      return {
        uri: post.uri,
        cid: post.cid,
        author: {
          did: post.author.did,
          handle: post.author.handle,
          displayName: post.author.displayName,
          avatar: post.author.avatar,
        },
        text: post.record.text ?? "",
        createdAt: post.record.createdAt ?? post.indexedAt,
        likeCount: post.likeCount ?? 0,
        repostCount: post.repostCount ?? 0,
        replyCount: post.replyCount ?? 0,
        images,
        external,
      };
    });

  return { posts, cursor: data.cursor };
}
