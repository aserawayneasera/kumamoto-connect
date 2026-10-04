import { listEvents } from "@/lib/events";
export async function GET(){try{return Response.json({events:await listEvents(),now:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});}catch(e){console.error(e);return Response.json({error:"Activities are unavailable. Please try again."},{status:503});}}
