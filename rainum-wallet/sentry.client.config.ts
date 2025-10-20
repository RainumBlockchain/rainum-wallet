import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://7a7e13108ae538517f7d62347db6062f@o4510188793167872.ingest.us.sentry.io/4510188796837888",
  tracesSampleRate: 1,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
