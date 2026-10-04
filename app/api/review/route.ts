import { reviewer,sameOrigin } from "@/lib/auth";
import { listEvents,getEvent,saveEvent } from "@/lib/events";
import { eventInput } from "@/lib/validation";
export async function GET(){if(!await reviewer())return Response.json({error:"Reviewer access required."},{status:403});try{return Response.json({events:await listEvents(true)},{headers:{"Cache-Control":"no-store"}});}catch{return Response.json({error:"Review queue unavailable."},{status:503});}}
export async function PATCH(request:Request){
  if(!sameOrigin(request)||!await reviewer())return Response.json({error:"Reviewer access required."},{status:403});
  try{
    const raw=await request.text();if(raw.length>40000)return Response.json({error:"Request is too large."},{status:413});
    const body=JSON.parse(raw);if(typeof body.id!=="string"||!["published","rejected","archived","pending"].includes(body.status))return Response.json({error:"Invalid review."},{status:400});
    const record=await getEvent(body.id,true);if(!record)return Response.json({error:"Activity not found."},{status:404});
    const parsed=eventInput.safeParse(body.event??record);if(!parsed.success)return Response.json({error:"Check the activity details."},{status:400});
    if(body.status==="published"&&(body.confirmed!==true||Date.parse(parsed.data.endAt)<=Date.now()))return Response.json({error:"Check the source and choose a future session before publishing."},{status:400});
    const updated={...record,...parsed.data,status:body.status,managedByImport:record.origin==="official"&&record.managedByImport===true&&JSON.stringify(parsed.data)===JSON.stringify(eventInput.parse(record)),reviewedAt:body.status==="published"?new Date().toISOString():record.reviewedAt,reviewNote:String(body.note??"").slice(0,1500)};
    await saveEvent(updated);return Response.json({event:updated});
  }catch(e){console.error("Review save failed",e);return Response.json({error:"Review was not saved."},{status:503});}
}
