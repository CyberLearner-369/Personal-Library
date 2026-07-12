export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  /** Return false to stop retrying (e.g. on auth errors). */
  shouldRetry?: (error: unknown) => boolean;
}

/** Retry with exponential backoff and jitter. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 600, shouldRetry = () => true }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === attempts - 1 || !shouldRetry(error)) break;
      const delay = baseDelayMs * 2 ** i + Math.random() * 200;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
