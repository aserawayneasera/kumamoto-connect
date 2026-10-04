import { env } from "cloudflare:workers";
import type { EventRecord } from "./domain";
import { seedEvents } from "./seed";
type Row = { data: string; status: EventRecord["status"] };
export function db() { if (!env.DB) throw new Error("Event database unavailable"); return env.DB; }
export async function ensureSeed() {
  const database = db();
  const seeded=await database.prepare("SELECT id FROM seed_versions WHERE id = ?").bind("october-2026-v1").first();
  const now = new Date().toISOString();
  if(!seeded)await database.batch([...seedEvents.map(e => database.prepare("INSERT OR IGNORE INTO events (id, status, start_at, end_at, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(e.id, e.status, e.startAt, e.endAt, JSON.stringify(e), now, now)), database.prepare("INSERT OR IGNORE INTO seed_versions (id) VALUES (?)").bind("october-2026-v1")]);
  // Carry the October 3 official availability/booking check into the existing
  // database without resetting titles, edits, archives or review decisions.
  if(!await database.prepare("SELECT id FROM seed_versions WHERE id=?").bind("october-2026-source-check-v2").first()){
    const updates=seedEvents.filter(e=>e.id==="canada-cafe-en-1008"||e.id==="kids-cafe-1010");
    await database.batch([...updates.map(e=>database.prepare("UPDATE events SET data=json_set(data,'$.availability',?,'$.bookingUrl',?,'$.bookingEn',?,'$.bookingJa',?,'$.sourceCheckedAt',?,'$.origin','official'),updated_at=? WHERE id=? AND status='published' AND json_extract(data,'$.reviewedAt')=? AND json_extract(data,'$.managedByImport') IS NULL AND json_extract(data,'$.contactEmail') IS NULL").bind(e.availability??"unknown",e.bookingUrl,e.bookingEn,e.bookingJa,e.sourceCheckedAt??now,now,e.id,"2026-10-02T12:00:00.000Z")),database.prepare("INSERT OR IGNORE INTO seed_versions (id) VALUES (?)").bind("october-2026-source-check-v2")]);
  }

}
export function publicEvent(e: EventRecord): EventRecord { const { contactEmail: _email, contactName: _name, reviewNote: _note, importIssues: _issues, agentSummary: _agent, sourceHash: _hash, managedByImport: _managed, ...record } = e; return { ...record, origin: e.origin ?? (e.contactEmail ? "community" : "official") }; }
function decode(row: Row): EventRecord { return { ...JSON.parse(row.data), status: row.status }; }
export async function listEvents(includeAll = false) {
  await ensureSeed();
  const q = includeAll ? db().prepare("SELECT data, status FROM events ORDER BY start_at") : db().prepare("SELECT data, status FROM events WHERE status = 'published' AND end_at > ? ORDER BY start_at").bind(new Date().toISOString());
  const result = await q.all<Row>();
  return result.results.map(row => includeAll ? decode(row) : publicEvent(decode(row)));
}
export async function getEvent(id: string, includePrivate = false) {
  await ensureSeed();
  const row = await db().prepare("SELECT data, status FROM events WHERE id = ?").bind(id).first<Row>();
  if (!row) return null; const e = decode(row); if (!includePrivate && e.status !== "published") return null;
  return includePrivate ? e : publicEvent(e);
}
export async function saveEvent(e: EventRecord, insertOnly = false) {
  const now = new Date().toISOString();
  const query = insertOnly ? "INSERT INTO events (id, status, start_at, end_at, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)" : "INSERT INTO events (id, status, start_at, end_at, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status = excluded.status, start_at = excluded.start_at, end_at = excluded.end_at, data = excluded.data, updated_at = excluded.updated_at";
  await db().prepare(query).bind(e.id, e.status, e.startAt, e.endAt, JSON.stringify(e), e.createdAt ?? now, now).run();
}
export async function checkRateLimit(key: string) {
  const now = Math.floor(Date.now() / 1000);
  await db().prepare("DELETE FROM rate_limits WHERE reset_at < ?").bind(now).run();
  const row = await db().prepare("INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN reset_at < ? THEN 1 ELSE count + 1 END, reset_at = CASE WHEN reset_at < ? THEN excluded.reset_at ELSE reset_at END RETURNING count").bind(key, now + 3600, now, now).first<{ count: number }>();
  return (row?.count ?? 99) <= 5;
}
