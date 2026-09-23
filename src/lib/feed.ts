import { PUBLIC_API } from "./config";
import { fetchJson } from "./http";

export interface AspectRatio {
  width: number;
  height: number;
}

export interface FeedImage {
  thumb: string;
  fullsize: string;
  alt?: string;
  /** Lets the page reserve the image's box before it loads (no reflow). */
  aspectRatio?: AspectRatio;
}

export interface FeedExternal {
  uri: string;
  title?: string;
  description?: string;
  thumb?: string;
}

export interface FeedVideo {
  /** HLS playlist URL (video.bsky.app) */
  playlist: string;
  thumbnail?: string;
  alt?: string;
  aspectRatio?: AspectRatio;
}

/** Rich-text annotation (mention / link / hashtag) over a UTF-8 byte range. */
export interface FacetFeature {
  $type: string;
  did?: string;
  uri?: string;
  tag?: string;
}

export interface Facet {
  index: { byteStart: number; byteEnd: number };
  features: FacetFeature[];
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
  video?: FeedVideo;
  facets?: Facet[];
  /** Pinned to the top of the author's profile. */
  pinned?: boolean;
}

interface EmbedView {
  $type: string;
  images?: FeedImage[];
  external?: FeedExternal;
  playlist?: string;
  thumbnail?: string;
  alt?: string;
  aspectRatio?: AspectRatio;
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
      record: { text?: string; createdAt?: string; facets?: Facet[] };
      embed?: EmbedView & { media?: EmbedView };
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
  video?: FeedVideo;
} {
  if (!embed) return { images: [] };
  // recordWithMedia nests the media one level deeper
  const media = embed.media ?? embed;
  const video = media.playlist
    ? {
        playlist: media.playlist,
        thumbnail: media.thumbnail,
        alt: media.alt,
        aspectRatio: media.aspectRatio,
      }
    : undefined;
  const images = (media.images ?? []).map(({ thumb, fullsize, alt, aspectRatio }) => ({
    thumb,
    fullsize,
    alt,
    aspectRatio,
  }));
  return { images, external: media.external, video };
}

/**
 * Fetch one page of the owner's original posts (replies and reposts
 * filtered out) from the public AppView. No auth required.
 */
export interface FeedPage {
  posts: FeedPost[];
  cursor?: string;
}

export async function fetchAuthorPosts(
  handle: string,
  cursor?: string,
  signal?: AbortSignal,
): Promise<FeedPage> {
  const params = new URLSearchParams({
    actor: handle,
    limit: "30",
    filter: "posts_no_replies",
    includePins: "true",
  });
  if (cursor) params.set("cursor", cursor);

  const data = await fetchJson<AuthorFeedResponse>(
    `${PUBLIC_API}/xrpc/app.bsky.feed.getAuthorFeed?${params}`,
    { signal },
  );

  const isPin = (reason: unknown): boolean =>
    (reason as { $type?: string } | undefined)?.$type ===
    "app.bsky.feed.defs#reasonPin";

  const posts = data.feed
    // keep originals and the pinned post; drop reposts and replies
    .filter((item) => (!item.reason || isPin(item.reason)) && !item.reply)
    .map(({ post, reason }) => {
      const { images, external, video } = extractEmbeds(post.embed);
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
        video,
        facets: post.record.facets,
        pinned: isPin(reason),
      };
    });

  return { posts, cursor: data.cursor };
}

/**
 * Tenor/Giphy embeds arrive as external links; render those inline as GIFs.
 * Returns the GIF's size when the URL carries it (Bluesky's GIF picker adds
 * ?hh=&ww=), so its box can be reserved before it loads.
 */
export function gifEmbed(uri: string): { size?: AspectRatio } | null {
  try {
    const { hostname, pathname, searchParams } = new URL(uri);
    const isGif =
      /\.gif$/i.test(pathname) || hostname.endsWith("tenor.com") || hostname.endsWith("giphy.com");
    if (!isGif) return null;
    const width = Number(searchParams.get("ww"));
    const height = Number(searchParams.get("hh"));
    return { size: width > 0 && height > 0 ? { width, height } : undefined };
  } catch {
    return null;
  }
}
