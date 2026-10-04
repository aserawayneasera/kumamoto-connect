import { z } from "zod";
import { sameOrigin } from "@/lib/auth";
import { activityAssistant } from "@/lib/assistant";
import { aiStatus,ipLimit } from "@/lib/settings";
import { AIError } from "@/lib/ai";
export async function GET(){try{const s=await aiStatus();return Response.json({provider:s.provider,openaiConfigured:s.openaiConfigured,claudeConfigured:s.claudeConfigured},{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({error:"Assistant unavailable"},{status:503});}}
export async function POST(request:Request){if(!sameOrigin(request))return Response.json({error:"Open KumaConnect to use the assistant."},{status:403});try{const raw=await request.text();if(raw.length>2500)return Response.json({error:"Message too long"},{status:413});const body=z.object({query:z.string().trim().min(2).max(700),lang:z.enum(["en","ja"]),provider:z.enum(["openai","claude"]).optional()}).parse(JSON.parse(raw));if(!await ipLimit(request,"assistant",8))return Response.json({error:"hourly_limit"},{status:429});return Response.json(await activityAssistant(body.query,body.lang,body.provider),{headers:{"Cache-Control":"no-store"}});}catch(error){return Response.json({error:error instanceof AIError?error.code:error instanceof z.ZodError?"invalid_request":"assistant_unavailable"},{status:error instanceof z.ZodError?400:503});}}
