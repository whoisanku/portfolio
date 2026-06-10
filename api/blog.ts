import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { rkey } = req.query;

  // Default Open Graph metadata
  let title = "Ankit Bhandari";
  let description = "Ankit Bhandari — full stack developer. Builder of Porto, Connectsky and other ATProtocol tools.";
  let ogImage = "";

  if (rkey && typeof rkey === "string") {
    try {
      const OWNER_HANDLE = "anku.bsky.social";
      const BLOG_COLLECTION = "com.whtwnd.blog.entry";
      const PUBLIC_API = "https://public.api.bsky.app";

      // 1. Resolve owner handle to DID
      const resolveRes = await fetch(
        `${PUBLIC_API}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(OWNER_HANDLE)}`,
      );
      if (resolveRes.ok) {
        const { did } = (await resolveRes.json()) as { did: string };

        // 2. Fetch the specific blog post record
        const recordRes = await fetch(
          `${PUBLIC_API}/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=${BLOG_COLLECTION}&rkey=${rkey}`,
        );
        if (recordRes.ok) {
          const record = (await recordRes.json()) as {
            value?: {
              title?: string;
              content?: string;
              ogp?: { url: string };
            };
          };

          if (record.value) {
            title = record.value.title?.trim() || "Untitled Blog Post";

            // Extract plain-text excerpt for description
            if (record.value.content) {
              const textContent = record.value.content
                .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // Remove images
                .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // Remove markdown link syntax
                .replace(/[#>*`_~-]+/g, " ")
                .replace(/\s+/g, " ")
                .trim();
              description =
                textContent.length > 180
                  ? `${textContent.slice(0, 180).trimEnd()}…`
                  : textContent;
            }

            // Find cover image URL
            if (record.value.ogp?.url) {
              ogImage = record.value.ogp.url;
            } else {
              // Fallback to first image in markdown content if ogp is missing
              const match = record.value.content?.match(/!\[.*?\]\((.*?)\)/);
              if (match) {
                ogImage = match[1];
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Error generating OG tags:", e);
    }
  }

  // 3. Read the built index.html template
  let html = "";
  try {
    const filePath = path.join(process.cwd(), "dist", "index.html");
    html = fs.readFileSync(filePath, "utf8");
  } catch (e) {
    try {
      const filePath = path.join(process.cwd(), "index.html");
      html = fs.readFileSync(filePath, "utf8");
    } catch (err) {
      html = `<!doctype html><html><head><title>${escapeHtml(title)}</title></head><body><div id="root"></div></body></html>`;
    }
  }

  // 4. Construct Open Graph & Twitter meta tags
  const ogTags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />` : ""}
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />` : ""}
  `;

  // Remove existing static title and description tags to prevent duplication
  html = html.replace(/<title>.*?<\/title>/gi, "");
  html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, "");

  // Inject OG tags right after opening <head>
  html = html.replace(/<head>/i, `<head>${ogTags}`);

  res.setHeader("Content-Type", "text/html");
  return res.status(200).send(html);
}
