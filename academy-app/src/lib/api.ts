import { createClient } from '@findemy/api-client';
import { ApiError } from '@findemy/types';
import { useAuth } from '@/stores/auth';

const REFRESH_TIMEOUT_MS = 10_000;

export function getBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
  if (process.env.EXPO_PUBLIC_ENV !== 'development' && !url.startsWith('https://')) {
    throw new Error(
      `EXPO_PUBLIC_API_URL must use https:// in non-development builds (got "${url}")`
    );
  }
  return url;
}

// Shared in-flight refresh so concurrent 401s trigger a single refresh call.
let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const { refreshToken } = useAuth.getState();
  if (!refreshToken) {
    useAuth.getState().clear();
    return null;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('REFRESH_TIMEOUT')), REFRESH_TIMEOUT_MS);
  });

  try {
    const response = await Promise.race([
      api.auth.refresh({ refresh_token: refreshToken }),
      timeout,
    ]);
    // Re-read state after the await: the user may have logged out mid-refresh,
    // in which case we must not resurrect the session.
    const current = useAuth.getState();
    if (!current.account) {
      current.clear();
      return null;
    }
    current.setAuth({
      access: response.access_token,
      refresh: response.refresh_token,
      account: current.account,
      academy: current.academy,
    });
    return response.access_token;
  } catch (error) {
    // Only force re-login when the server actually rejected the refresh token.
    // Transient failures (network error, timeout) must not clear the session.
    if (error instanceof ApiError) {
      useAuth.getState().clear();
    }
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export const api = createClient({
  baseUrl: getBaseUrl(),
  getAccessToken: () => useAuth.getState().accessToken,
  onUnauthorized: () => {
    if (!refreshInFlight) {
      refreshInFlight = doRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  },
});

/**
 * Fire an authed request that the JSON-only api-client can't express (multipart
 * upload, DELETE-with-body). Reuses getBaseUrl() (https enforcement) and the
 * SAME refresh machinery as the client: on 401 it triggers one shared refresh
 * and retries once. Never reads the base URL or token independently elsewhere.
 */
async function authedFetch(
  path: string,
  init: { method: string; body?: FormData | string; headers?: Record<string, string> }
): Promise<Response> {
  const url = `${getBaseUrl()}${path}`;
  const run = async () => {
    const token = useAuth.getState().accessToken;
    return fetch(url, {
      method: init.method,
      // RN's FormData type differs from the DOM's; cast at the boundary so the
      // multipart upload type-checks against react-native's fetch overloads.
      body: init.body as any,
      headers: {
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  let response = await run();
  if (response.status === 401) {
    // Single shared refresh (same promise concurrent JSON calls use).
    if (!refreshInFlight) {
      refreshInFlight = doRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    const newToken = await refreshInFlight;
    if (newToken) response = await run();
  }
  return response;
}

/** Multipart upload (image picker asset). Returns parsed JSON or throws. */
export async function uploadMultipart<T>(path: string, form: FormData): Promise<T> {
  // NOTE: do NOT set Content-Type — fetch sets the multipart boundary itself.
  const response = await authedFetch(path, { method: 'POST', body: form });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error((errorBody as any).message || 'Upload failed');
  }
  return response.json() as Promise<T>;
}

/** DELETE with a JSON body (the api-client request() doesn't take a DELETE body). */
export async function deleteJson<T>(path: string, body: unknown): Promise<T> {
  const response = await authedFetch(path, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error((errorBody as any).message || 'Request failed');
  }
  return response.json() as Promise<T>;
}
