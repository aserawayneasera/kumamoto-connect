export type Lang = "en" | "ja";
export const categories = ["all", "language", "culture", "community", "sports", "volunteering", "outdoors"] as const;
export type Category = Exclude<typeof categories[number], "all">;
export type EventRecord = {
  id: string; titleEn: string; titleJa: string; descriptionEn: string; descriptionJa: string;
  category: Category; startAt: string; endAt: string; venueEn: string; venueJa: string;
  address: string; area: string; price: number | null; languages: string[];
  englishWelcome: boolean | null; beginnerWelcome: boolean | null; soloWelcome: boolean | null;
  organizer: string; bookingUrl: string; bookingEn: string; bookingJa: string;
  sourceUrl: string; sourceName: string; reviewedAt: string | null;
  status: "pending" | "published" | "rejected" | "archived";
  recurring: boolean; audienceEn: string; audienceJa: string;
  contactEmail?: string; contactName?: string; reviewNote?: string; createdAt?: string;
  origin?: "official" | "community";
  sourceId?: string; sourceCheckedAt?: string; sourceHash?: string;
  managedByImport?: boolean; importIssues?: string[];
  availability?: "open" | "full" | "cancelled" | "unknown";
  agentSummary?: string;
};
export type Filters = { search: string; category: string; date: string; price: string; area: string; english: boolean; beginner: boolean; solo: boolean };
export const defaultFilters: Filters = { search: "", category: "all", date: "any", price: "any", area: "all", english: false, beginner: false, solo: false };
export const categoryLabels: Record<string, [string, string]> = { all: ["All activities", "すべて"], language: ["Language exchange", "語学・日本語"], culture: ["Culture & workshops", "文化・体験"], community: ["Community & families", "交流・家族"], sports: ["Sports & hobbies", "スポーツ・趣味"], volunteering: ["Volunteering", "ボランティア"], outdoors: ["Outdoors", "アウトドア"] };
export const areaLabels: Record<string, [string, string]> = { all: ["All areas", "すべての地域"], chuo: ["Chuo", "中央区"], higashi: ["Higashi", "東区"], nishi: ["Nishi", "西区"], minami: ["Minami", "南区"], kita: ["Kita", "北区"], kikuyo: ["Kikuyo", "菊陽町"], online: ["Online", "オンライン"], other: ["Other areas", "その他"] };
export const languageLabels: Record<string, [string, string]> = { en: ["English", "英語"], ja: ["Japanese", "日本語"], zh: ["Chinese", "中国語"], ko: ["Korean", "韓国語"], other: ["Other languages", "その他の言語"] };
export const textOf = (event: EventRecord, field: "title" | "description" | "venue" | "booking" | "audience", lang: Lang) => event[(field + (lang === "ja" ? "Ja" : "En")) as keyof EventRecord] as string;
export function dateRange(key: string, now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const pick = (t: string) => parts.find(p => p.type === t)!.value;
  const midnight = new Date(`${pick("year")}-${pick("month")}-${pick("day")}T00:00:00+09:00`);
  const day = new Date(midnight.getTime() + 9 * 3600000).getUTCDay();
  let start = midnight.getTime(), end = start + 86400000;
  if (key === "weekend") { start += (day === 0 ? -1 : 6 - day) * 86400000; end = start + 2 * 86400000; }
  if (key === "week") end = start + 7 * 86400000;
  return { start, end };
}
export function filterEvents(events: EventRecord[], filters: Filters, now = new Date()) {
  const query = filters.search.trim().toLowerCase(); const range = dateRange(filters.date, now);
  return events.filter(e => {
    if (e.status !== "published" || Date.parse(e.endAt) <= now.getTime()) return false;
    if (filters.category !== "all" && e.category !== filters.category) return false;
    if (filters.area !== "all" && e.area !== filters.area) return false;
    if (filters.date !== "any" && (Date.parse(e.startAt) < range.start || Date.parse(e.startAt) >= range.end)) return false;
    if (filters.price === "free" && e.price !== 0) return false;
    if (filters.price === "under1000" && (e.price === null || e.price >= 1000)) return false;
    if (filters.english && e.englishWelcome !== true) return false;
    if (filters.beginner && e.beginnerWelcome !== true) return false;
    if (filters.solo && e.soloWelcome !== true) return false;
    return !query || [e.titleEn, e.titleJa, e.descriptionEn, e.descriptionJa, e.venueEn, e.venueJa, e.organizer].join(" ").toLowerCase().includes(query);
  }).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}
export function formatDate(value: string, lang: Lang, options: Intl.DateTimeFormatOptions = {}) { return new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-GB", { timeZone: "Asia/Tokyo", ...options }).format(new Date(value)); }
export function priceLabel(value: number | null, lang: Lang) { return value === null ? (lang === "ja" ? "主催者に確認" : "Ask organizer") : value === 0 ? (lang === "ja" ? "無料" : "Free") : `¥${value.toLocaleString("ja-JP")}`; }
export function calendar(event: EventRecord, lang: Lang, origin: string) {
  const stamp = (v: string) => new Date(v).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const escape = (v: string) => v.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//KumaConnect//Activities//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${event.id}@kumaconnect`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(event.startAt)}`, `DTEND:${stamp(event.endAt)}`, `SUMMARY:${escape(textOf(event, "title", lang))}`, `LOCATION:${escape(textOf(event, "venue", lang) + " " + event.address)}`, `DESCRIPTION:${escape(textOf(event, "description", lang) + "\n" + textOf(event, "booking", lang) + "\n" + event.bookingUrl)}`, `URL:${origin}/events/${event.id}?lang=${lang}`, "END:VEVENT", "END:VCALENDAR"];
  return lines.map(line => { let folded = "", bytes = 0; for (const char of line) { const length = new TextEncoder().encode(char).length; if (bytes + length > 73) { folded += "\r\n "; bytes = 1; } folded += char; bytes += length; } return folded; }).join("\r\n") + "\r\n";
}
