import { getCalendarFeedByToken } from "@wayline/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const APP_URL = process.env.APP_URL;
const TZ = "America/Sao_Paulo";

/** Escapa texto conforme RFC 5545 (vírgula, ponto e vírgula, barra, quebra). */
function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Data (YYYYMMDD) no fuso do Brasil — o "dia do prazo" para o usuário. */
function ymd(d: Date): string {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return s.replace(/-/g, "");
}

/** Dia seguinte (DTEND de evento all-day é exclusivo). */
function nextDay(y: string): string {
  const dt = new Date(Date.UTC(+y.slice(0, 4), +y.slice(4, 6) - 1, +y.slice(6, 8) + 1));
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(
    dt.getUTCDate(),
  ).padStart(2, "0")}`;
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Dobra linhas em 75 octetos (RFC 5545) para máxima compatibilidade. */
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 74));
  rest = rest.slice(74);
  while (rest.length > 73) {
    parts.push(" " + rest.slice(0, 73));
    rest = rest.slice(73);
  }
  if (rest) parts.push(" " + rest);
  return parts.join("\r\n");
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const feed = await getCalendarFeedByToken(token).catch(() => null);
  if (!feed) return new Response("not found", { status: 404 });

  const now = stamp();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wayline//Tarefas//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Wayline — ${esc(feed.userName)}`,
    "X-WR-TIMEZONE:" + TZ,
  ];

  for (const t of feed.tasks) {
    const start = ymd(t.dueDate);
    const link = APP_URL ? `${APP_URL.replace(/\/$/, "")}/app?task=${t.id}` : "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:task-${t.id}@wayline`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${nextDay(start)}`,
      fold(`SUMMARY:${esc(t.title || "Tarefa")}`),
      fold(`DESCRIPTION:${esc(`Lista: ${t.listName}${link ? `\n${link}` : ""}`)}`),
      ...(link ? [fold(`URL:${link}`)] : []),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  const body = lines.join("\r\n") + "\r\n";

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="wayline.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
