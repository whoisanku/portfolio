import { RichText } from "@atproto/api";
import { LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import Loader from "../components/Loader";
import { createBlogEntry, whtwndUrl } from "../lib/blog";
import { OWNER_HANDLE } from "../lib/config";

const MAX_POST_LENGTH = 300;

type Tab = "post" | "blog";

interface Published {
  kind: Tab;
  url: string;
  internalUrl?: string;
}

const inputClass =
  "w-full rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-colors focus:border-blue-500/60";

const AdminPanel = () => {
  const { status, agent, error: authError, signIn, signOut } = useAuth();

  const [tab, setTab] = useState<Tab>("post");
  const [postText, setPostText] = useState("");
  const [blogTitle, setBlogTitle] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<Published | null>(null);

  const publishPost = async (e: FormEvent) => {
    e.preventDefault();
    if (!agent || !postText.trim() || busy) return;
    setBusy(true);
    setError(null);
    setPublished(null);
    try {
      const rt = new RichText({ text: postText.trim() });
      await rt.detectFacets(agent);
      const res = await agent.post({
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
      });
      const rkey = res.uri.split("/").pop();
      setPostText("");
      setPublished({
        kind: "post",
        url: `https://bsky.app/profile/${OWNER_HANDLE}/post/${rkey}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish post");
    } finally {
      setBusy(false);
    }
  };

  const publishBlog = async (e: FormEvent) => {
    e.preventDefault();
    if (!agent || !blogTitle.trim() || !blogContent.trim() || busy) return;
    setBusy(true);
    setError(null);
    setPublished(null);
    try {
      const { rkey } = await createBlogEntry(agent, {
        title: blogTitle.trim(),
        content: blogContent,
      });
      setBlogTitle("");
      setBlogContent("");
      setPublished({
        kind: "blog",
        url: whtwndUrl(OWNER_HANDLE, rkey),
        internalUrl: `/blog/${rkey}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish blog");
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") return <Loader label="Checking session…" />;

  if (status === "signed-out") {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-xl font-medium text-white">Admin</h1>
        <p className="text-sm text-zinc-500">
          Sign in with Bluesky OAuth to write posts &amp; blogs.
        </p>
        {/* Single click, fixed to the owner's handle — not editable. */}
        <button
          type="button"
          onClick={() => void signIn()}
          className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          Continue as @{OWNER_HANDLE}
        </button>
        {authError && <p className="text-sm text-red-400">{authError}</p>}
      </div>
    );
  }

  const remaining = MAX_POST_LENGTH - postText.length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-medium text-white">Write</h1>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-red-400"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border border-zinc-800 p-1">
        {(["post", "blog"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1.5 text-sm capitalize transition-colors ${
              tab === t
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "post" ? (
        <form onSubmit={publishPost} className="flex flex-col gap-3">
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="What's up?"
            rows={5}
            className={inputClass}
          />
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${remaining < 0 ? "text-red-400" : "text-zinc-600"}`}
            >
              {remaining}
            </span>
            <button
              type="submit"
              disabled={busy || !postText.trim() || remaining < 0}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Publishing…" : "Publish post"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={publishBlog} className="flex flex-col gap-3">
          <input
            type="text"
            value={blogTitle}
            onChange={(e) => setBlogTitle(e.target.value)}
            placeholder="Title"
            className={inputClass}
          />
          <textarea
            value={blogContent}
            onChange={(e) => setBlogContent(e.target.value)}
            placeholder="Write in Markdown…"
            rows={14}
            className={`${inputClass} font-mono text-[0.85rem]`}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-600">
              Markdown · published as a WhiteWind entry
            </span>
            <button
              type="submit"
              disabled={busy || !blogTitle.trim() || !blogContent.trim()}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Publishing…" : "Publish blog"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {published && (
        <p className="mt-4 text-sm text-emerald-400">
          Published!{" "}
          <a
            href={published.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            View on {published.kind === "post" ? "Bluesky" : "WhiteWind"}
          </a>
          {published.internalUrl && (
            <>
              {" · "}
              <Link to={published.internalUrl} className="underline">
                View on this site
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
};

/** OAuth session management is scoped to the admin route only. */
const AdminPage = () => (
  <AuthProvider>
    <AdminPanel />
  </AuthProvider>
);

export default AdminPage;

