import * as Sentry from "@sentry/nextjs";

// Só ativa se houver DSN (env-gated). Sem DSN, é no-op — nada é enviado.
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    environment: process.env.NODE_ENV,
    // Não enviar dados de request potencialmente sensíveis por padrão.
    sendDefaultPii: false,
  });
}
