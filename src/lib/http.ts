/**
 * JSON fetch with a deadline.
 *
 * Every public read on the site (Bluesky AppView, PLC directory, the owner's
 * PDS) goes through here, so a stalled upstream fails in a bounded time and
 * the query layer can retry it, instead of leaving a spinner up forever.
 */
const DEFAULT_TIMEOUT_MS = 12_000;

/** A non-2xx response. `status` lets callers tell "not found" from "down". */
export class HttpError extends Error {
  readonly status: number;
  /** XRPC error name from the body, when the server sent one. */
  readonly code?: string;

  constructor(status: number, url: string, code?: string) {
    super(`Request failed (${status}${code ? ` ${code}` : ""}): ${url}`);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

/** Worth retrying: network failures, timeouts, rate limits and server errors. */
export function isTransient(err: unknown): boolean {
  if (err instanceof HttpError) return err.status === 429 || err.status >= 500;
  // A caller that cancelled (navigated away) doesn't want a retry; our own
  // deadline (TimeoutError) and fetch() network failures (TypeError) do.
  return !(err instanceof DOMException && err.name === "AbortError");
}

/** The request definitely doesn't exist (as opposed to failing to load). */
export function isNotFound(err: unknown): boolean {
  if (!(err instanceof HttpError)) return false;
  return (
    err.status === 404 ||
    err.code === "RecordNotFound" ||
    // PDSes answer unknown rkeys with a plain 400 on some versions
    (err.status === 400 && /not ?found/i.test(err.code ?? ""))
  );
}

export async function fetchJson<T>(
  url: string,
  { signal, timeoutMs = DEFAULT_TIMEOUT_MS }: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    timeoutMs,
  );
  const onAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) onAbort();
  else signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      let code: string | undefined;
      try {
        code = ((await res.json()) as { error?: string }).error;
      } catch {
        // not JSON
      }
      throw new HttpError(res.status, url, code);
    }
    return (await res.json()) as T;
  } catch (err) {
    // Surface our deadline as a TimeoutError rather than a bare AbortError.
    if (controller.signal.aborted && controller.signal.reason instanceof DOMException) {
      if (!signal?.aborted) throw controller.signal.reason;
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
