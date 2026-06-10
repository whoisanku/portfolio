# Portfolio — anku.bsky.social

Personal portfolio built on React 19 + Vite + Tailwind CSS 4, fully powered by
[AT Protocol](https://atproto.com/). No backend, no database — the Bluesky
account **is** the CMS.

## How content works

| Section | Source |
| ------- | ------ |
| Posts (`/posts`) | `app.bsky.feed.getAuthorFeed` from the public AppView |
| Blogs (`/blog`) | [WhiteWind](https://whtwnd.com) `com.whtwnd.blog.entry` records read straight from the PDS (markdown) |
| Admin (`/admin`) | atproto **OAuth** sign-in (owner only) to publish posts & blog entries |

Blog entries written from `/admin` are standard WhiteWind records, so they are
also readable/editable on whtwnd.com with the same account.

## Development

```bash
npm install
npm run dev      # http://localhost:5173 (OAuth uses the loopback client, no setup needed)
npm run build    # type-check + production build
npm run lint
```

> OAuth note (dev): atproto loopback clients only work on IP origins, so the
> library redirects `localhost` → `127.0.0.1` when you start a sign-in. That's
> expected.

## Deploying

1. **OAuth client metadata** — edit
   [`public/oauth/client-metadata.json`](public/oauth/client-metadata.json) and
   replace every URL with your deployed origin. `client_id` must be exactly
   `https://<your-domain>/oauth/client-metadata.json` and `redirect_uris` must
   contain `https://<your-domain>/admin`.
2. **SPA fallback** — the router uses history URLs (`/blog/...`, `/admin`), so
   the host must rewrite unknown paths to `index.html` (Vercel/Netlify do this
   automatically for SPAs; GitHub Pages needs a 404.html fallback).

## Configuration

Everything is keyed off [`src/lib/config.ts`](src/lib/config.ts):

- `OWNER_HANDLE` — the Bluesky account that owns the site (feed, blogs, admin).
- `BLOG_COLLECTION` — blog record collection (WhiteWind by default; swap for
  `site.standard.document` if you migrate to standard.site later).

## Structure

```
src/
  auth/        AuthContext — OAuth session, owner check, sign in/out
  components/  Layout, OrbitNav, BackgroundDots, AnimatedSign, Loader…
  data/        projects + press mentions
  lib/         config, atproto helpers, blog (WhiteWind), feed, oauth client
  pages/       Home, BlogList, BlogPost, Posts, Admin
```
