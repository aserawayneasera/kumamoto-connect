import { env } from "cloudflare:workers";
import { db } from "./events";
export type Provider = "openai" | "claude";
export type Preferences = { provider: Provider; openaiModel: string; claudeModel: string; autoPublish: boolean; aiImports: boolean; dailyAiLimit: number };
export const defaults: Preferences = { provider: "openai", openaiModel: "gpt-4.1-mini", claudeModel: "claude-haiku-4-5", autoPublish: true, aiImports: true, dailyAiLimit: 100 };
export function runtime(name: string) { return (env as unknown as Record<string,string|undefined>)[name] ?? ""; }
export async function preferences(): Promise<Preferences> {
 const row = await db().prepare("SELECT data FROM app_settings WHERE key = ?").bind("preferences").first<{data:string}>();
 return { ...defaults, ...(row ? JSON.parse(row.data) : {}), openaiModel: runtime("OPENAI_MODEL") || (row ? JSON.parse(row.data).openaiModel : "") || defaults.openaiModel, claudeModel: runtime("CLAUDE_MODEL") || (row ? JSON.parse(row.data).claudeModel : "") || defaults.claudeModel };
}
export async function savePreferences(value: Preferences) { await db().prepare("INSERT INTO app_settings (key,data) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data").bind("preferences",JSON.stringify(value)).run(); }
export function apiKey(provider: Provider) { return runtime(provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY"); }
export async function aiStatus() { const p=await preferences();return {...p,openaiConfigured:!!apiKey("openai"),claudeConfigured:!!apiKey("claude")}; }
export async function takeLimit(key:string,limit:number,seconds:number) {
 const now=Math.floor(Date.now()/1000);
 const row=await db().prepare("INSERT INTO rate_limits (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at <= ? THEN 1 ELSE count+1 END, reset_at=CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END RETURNING count").bind(key,now+seconds,now,now).first<{count:number}>();return (row?.count??Infinity)<=limit;
}
export async function sha256(value:string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,"0")).join(""); }
export async function ipLimit(request:Request,scope:string,limit:number,seconds=3600) { return takeLimit(scope+":"+await sha256(request.headers.get("cf-connecting-ip")??"unknown"),limit,seconds); }
export async function aiBudget() { const p=await preferences(); const day=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());return takeLimit("ai:"+day,p.dailyAiLimit,172800); }
