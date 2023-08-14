import { SENTRY_DSN } from "@config";
export const sentryInit = (Sentry: any, app: any) => {
  return Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({
        tracing: true,
      }),
      // enable Express.js middleware tracing
      new Sentry.Integrations.Express({
        app,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!,
  });
};
