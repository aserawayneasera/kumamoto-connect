import { submissionInput } from "@/lib/validation";
import { checkRateLimit,saveEvent } from "@/lib/events";
import { sameOrigin } from "@/lib/auth";
export async function POST(request:Request){
  if(!sameOrigin(request))return Response.json({error:"Open KumaConnect to submit an activity."},{status:403});
  if(Number(request.headers.get("content-length")??0)>30000)return Response.json({error:"Submission is too large."},{status:413});
  try{
    const raw=await request.text();if(raw.length>30000)return Response.json({error:"Submission is too large."},{status:413});
    const parsed=submissionInput.safeParse(JSON.parse(raw));
    if(!parsed.success)return Response.json({error:"Please check the required fields and HTTPS links."},{status:400});
    const {event,contactName,contactEmail}=parsed.data;
    if(Date.parse(event.endAt)<=Date.now())return Response.json({error:"Choose a future activity."},{status:400});
    const ip=request.headers.get("cf-connecting-ip")??"unknown";
    const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ip));
    const key=Array.from(new Uint8Array(bytes)).map(n=>n.toString(16).padStart(2,"0")).join("");
    if(!await checkRateLimit(key))return Response.json({error:"Please try again in an hour."},{status:429});
    const id=crypto.randomUUID();
    await saveEvent({...event,id,status:"pending",origin:"community",managedByImport:false,reviewedAt:null,contactName,contactEmail,createdAt:new Date().toISOString()},true);
    return Response.json({id,status:"pending"},{status:201});
  }catch(e){console.error("Submission failed",e);return Response.json({error:"Submission was not saved. Please try again."},{status:503});}
}
