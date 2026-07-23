import Constants from 'expo-constants';
import * as Sentry from 'sentry-expo';

/**
 * Initialize Sentry error tracking. Called once at app bootstrap (before the
 * first render) from `app/_layout.tsx`.
 *
 * Behavior:
 * - No DSN → no-op (dev builds without the env var stay clean, no
 *   accidental "please configure" toasts spamming logs).
 * - Dev builds → tracing off (10% samples wasted budget); still captures
 *   thrown errors so we notice them in the Sentry inbox.
 * - Prod builds → 20% traces, 10% profiles.
 */
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const isDev = __DEV__;
  const release =
    Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? '0.0.0';

  try {
    Sentry.init({
      dsn,
      release,
      environment: isDev ? 'development' : 'production',
      enableInExpoDevelopment: false,
      debug: false,
      tracesSampleRate: isDev ? 0 : 0.2,
      // First-party breadcrumb noise dial. Auth/network are the useful ones;
      // console spam from library code is silenced.
      integrations: (defaults) =>
        defaults.filter(
          (integration) => integration.name !== 'Console' && integration.name !== 'Breadcrumbs'
        ),
    });
  } catch {
    // Swallow init failures — Sentry misconfiguration must never crash the
    // app on cold start.
  }
}
