import * as Sentry from "@sentry/nextjs";

// Erros do lado do cliente. Env-gated pela pública NEXT_PUBLIC_SENTRY_DSN.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Session Replay desligado por padrão (privacidade/quota); ligue se quiser.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  });
}

// Instrumenta transições de rota do App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
