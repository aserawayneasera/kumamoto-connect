import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export async function reviewer() {
  const user = await getChatGPTUser();
  const config = (env as unknown as { REVIEWER_EMAILS?: string }).REVIEWER_EMAILS ?? "";
  return user && config.split(",").map(e=>e.trim().toLowerCase()).filter(Boolean).includes(user.email.toLowerCase()) ? user : null;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const configured = (env as unknown as { SITE_ORIGIN?: string }).SITE_ORIGIN;
  return origin === new URL(request.url).origin || (!!configured && origin === configured);
}
