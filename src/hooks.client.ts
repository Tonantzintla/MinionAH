import { dev } from "$app/environment";
import { env as envPublic } from "$env/dynamic/public";
import { browserTracingIntegration, contextLinesIntegration, extraErrorDataIntegration, handleErrorWithSentry, httpClientIntegration, init, replayIntegration } from "@sentry/sveltekit";

const { PUBLIC_SENTRY_DSN } = envPublic;

init({
  dsn: PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,

  tunnel: "/api/internal/tunnel",

  // This sets the sample rate to be 50%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: dev ? 1.0 : 0.5,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: dev ? 1.0 : 0.5,

  integrations: [replayIntegration(), browserTracingIntegration(), httpClientIntegration(), contextLinesIntegration(), extraErrorDataIntegration()],

  // This option is required for capturing headers and cookies.
  sendDefaultPii: true,

  // Disable Sentry during development
  enabled: !dev,
  environment: dev ? "development" : "production"
});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
