import { AIProviderError } from "@/lib/ai/types";

// Wraps a single provider call attempt with a request timeout (via
// AbortController) and exponential-backoff retries for transient/retryable
// failures. Non-retryable errors (bad config, auth) fail immediately.
export async function withTimeoutAndRetry<T>(
  attempt: (signal: AbortSignal) => Promise<T>,
  opts: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const maxRetries = opts.maxRetries ?? 2;

  let lastError: unknown;

  for (let attemptNumber = 0; attemptNumber <= maxRetries; attemptNumber++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await attempt(controller.signal);
      clearTimeout(timer);
      return result;
    } catch (e) {
      clearTimeout(timer);
      lastError = e;

      const retryable = e instanceof AIProviderError ? e.retryable : controller.signal.aborted;
      if (!retryable || attemptNumber === maxRetries) break;

      const backoffMs = 500 * Math.pow(2, attemptNumber);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  throw lastError;
}
