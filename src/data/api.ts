import { getConfig } from '@/config';
import { ApiError, type Mutation, type PullResult, type PushResult } from '@/types/api';
import { withRetry } from '@/lib/retry';

/**
 * Client for the Google Apps Script backend (backend/Code.gs).
 *
 * Apps Script web apps do not answer CORS preflight (OPTIONS) requests, so
 * every call is a "simple request": POST with text/plain body carrying
 * JSON. The Google ID token travels in the body — not a header — for the
 * same reason. The script verifies it server-side on every call.
 */

interface Envelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export type TokenProvider = () => string | null;

export class SheetsApi {
  constructor(private getToken: TokenProvider) {}

  private async call<T>(action: string, payload: unknown = {}): Promise<T> {
    const { scriptUrl } = getConfig();
    if (!scriptUrl) throw new ApiError('Backend is not configured', 'bad-request');
    const idToken = this.getToken();
    if (!idToken) throw new ApiError('Sign in with Google to sync', 'unauthorized');

    return withRetry(
      async () => {
        let response: Response;
        try {
          response = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, payload, idToken }),
            redirect: 'follow',
          });
        } catch {
          throw new ApiError('Network unreachable', 'network');
        }
        if (!response.ok) {
          throw new ApiError(`Backend returned HTTP ${response.status}`, 'server');
        }
        let envelope: Envelope<T>;
        try {
          envelope = (await response.json()) as Envelope<T>;
        } catch {
          throw new ApiError(
            'Unexpected response — check the Apps Script deployment URL',
            'server',
          );
        }
        if (!envelope.ok) {
          const code =
            envelope.code === 'unauthorized' || envelope.code === 'forbidden'
              ? envelope.code
              : 'server';
          throw new ApiError(envelope.error ?? 'Backend error', code);
        }
        return envelope.data as T;
      },
      {
        attempts: 3,
        shouldRetry: (error) =>
          error instanceof ApiError &&
          (error.code === 'network' || error.code === 'server'),
      },
    );
  }

  ping(): Promise<{ serverTime: string; bookCount: number }> {
    return this.call('ping');
  }

  pull(since: string | null): Promise<PullResult> {
    return this.call('pull', { since });
  }

  push(mutations: Mutation[]): Promise<PushResult> {
    return this.call('push', { mutations });
  }

  backupNow(): Promise<{ fileName: string }> {
    return this.call('backupNow');
  }
}
