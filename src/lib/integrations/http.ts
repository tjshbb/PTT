import type { RetryOptions } from "./types";

export class IntegrationError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly status?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "IntegrationError";
  }
}

const DEFAULT_RETRY: RetryOptions = { retries: 3, baseDelayMs: 250 };

/**
 * fetch with timeout, bounded exponential backoff, and retry on 429/5xx.
 * All external API calls in this app go through here so error handling and
 * rate-limit behavior are consistent.
 */
export async function fetchJson<T>(
  url: string,
  init: RequestInit & { provider: string; timeoutMs?: number },
  retry: RetryOptions = DEFAULT_RETRY,
): Promise<T> {
  const { provider, timeoutMs = 8000, ...rest } = init;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retry.retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...rest, signal: controller.signal });
      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        lastErr = new IntegrationError(`${provider} returned ${res.status}`, provider, res.status);
        await sleep(backoff(retry.baseDelayMs, attempt, res.headers.get("retry-after")));
        continue;
      }
      if (!res.ok) {
        throw new IntegrationError(`${provider} returned ${res.status}`, provider, res.status);
      }
      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (err instanceof IntegrationError && err.status && err.status < 500 && err.status !== 429) {
        throw err; // non-retryable client error
      }
      if (attempt < retry.retries) await sleep(backoff(retry.baseDelayMs, attempt));
    }
  }
  throw new IntegrationError(
    `${provider} failed after ${retry.retries + 1} attempts`,
    provider,
    undefined,
    lastErr,
  );
}

function backoff(base: number, attempt: number, retryAfter?: string | null): number {
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (!Number.isNaN(secs)) return secs * 1000;
  }
  const jitter = Math.random() * base;
  return base * 2 ** attempt + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
