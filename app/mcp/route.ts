import { reviewer,sameOrigin } from "@/lib/auth";
import { importStatus,runImports } from "@/lib/imports";
export const dynamic="force-dynamic";
const tools=[{name:"check_import_status",description:"Read KumaConnect's official-source import status and recent results. Reviewer access required.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true}},{name:"refresh_official_activities",description:"Run due official-source imports using only approved sources. Public submissions and manual review decisions are preserved. Reviewer access required.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true}}];
export async function POST(request:Request){let rpc:any;try{const raw=await request.text();if(raw.length>5000)return new Response("Too large",{status:413});rpc=JSON.parse(raw);}catch{return Response.json({jsonrpc:"2.0",id:null,error:{code:-32700,message:"Parse error"}},{status:400});}
 const id=rpc.id??null;const result=(value:unknown)=>Response.json({jsonrpc:"2.0",id,result:value});const error=(code:number,message:string,status=200)=>Response.json({jsonrpc:"2.0",id,error:{code,message}},{status});
 if(rpc.jsonrpc!=="2.0"||typeof rpc.method!=="string")return error(-32600,"Invalid request",400);
 if(rpc.method==="initialize")return result({protocolVersion:"2025-03-26",capabilities:{tools:{}},serverInfo:{name:"KumaConnect official-source imports",version:"2.0.0"}});
 if(rpc.method==="notifications/initialized")return new Response(null,{status:202});
 if(rpc.method==="tools/list")return result({tools});
 if(rpc.method==="ping")return result({});
 if(rpc.method!=="tools/call")return error(-32601,"Method not found");
 if(request.headers.has("origin")&&!sameOrigin(request))return error(-32001,"Use the trusted updater connection",403);
 if(!await reviewer())return error(-32001,"Reviewer access required",403);
 if(rpc.params?.arguments&&Object.keys(rpc.params.arguments).length)return error(-32602,"No arguments accepted");
 try{if(rpc.params?.name==="check_import_status")return result({content:[{type:"text",text:JSON.stringify(await importStatus())}]});if(rpc.params?.name==="refresh_official_activities")return result({content:[{type:"text",text:JSON.stringify(await runImports(false))}]});return error(-32602,"Unknown tool");}catch{return result({isError:true,content:[{type:"text",text:"Import service unavailable. Existing data was preserved."}]});}
}
export async function GET(){return new Response("Use POST for MCP",{status:405,headers:{Allow:"POST"}});}
