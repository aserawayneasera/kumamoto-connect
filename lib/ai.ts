import { apiKey, aiBudget, preferences, type Provider } from "./settings";
export class AIError extends Error { constructor(public code:string) { super(code); } }
export type JsonSchema = Record<string,unknown>;
export async function aiJson(provider:Provider,name:string,instructions:string,input:string,schema:JsonSchema, maxTokens=1800, pdf?:{data:string;name:string}) {
 const key=apiKey(provider);if(!key)throw new AIError("not_configured");if(!await aiBudget())throw new AIError("daily_limit");const p=await preferences();
 const textContent=pdf?[{type:"input_file",filename:pdf.name,file_data:`data:application/pdf;base64,${pdf.data}`},{type:"input_text",text:input}]:input;
 const body=provider==="openai"?{model:p.openaiModel,store:false,instructions,input:pdf?[{role:"user",content:textContent}]:input,max_output_tokens:maxTokens,text:{format:{type:"json_schema",name,strict:true,schema}}}:{model:p.claudeModel,max_tokens:maxTokens,system:instructions,messages:[{role:"user",content:pdf?[{type:"document",source:{type:"base64",media_type:"application/pdf",data:pdf.data}},{type:"text",text:input}]:input}],output_config:{format:{type:"json_schema",schema}}};
 let response:Response;try{response=await fetch(provider==="openai"?"https://api.openai.com/v1/responses":"https://api.anthropic.com/v1/messages",{method:"POST",headers:provider==="openai"?{"Content-Type":"application/json",Authorization:`Bearer ${key}`}:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},body:JSON.stringify(body),signal:AbortSignal.timeout(40000)});}catch{throw new AIError("provider_unavailable");}
 if(!response.ok){await response.body?.cancel();throw new AIError(response.status===401||response.status===403?"invalid_key":response.status===429?"provider_limit":"provider_unavailable");}
 const result=await response.json() as {status?:string;stop_reason?:string;output?:Array<{content?:Array<{type:string;text?:string}>}>;content?:Array<{type:string;text?:string}>};
 if(result.status==="incomplete"||result.stop_reason==="max_tokens")throw new AIError("incomplete_output");
 const raw=provider==="openai"?result.output?.flatMap(x=>x.content??[]).filter(x=>x.type==="output_text").map(x=>x.text??"").join(""):result.content?.filter(x=>x.type==="text").map(x=>x.text??"").join("");
 if(!raw)throw new AIError("invalid_output");try{return JSON.parse(raw) as unknown;}catch{throw new AIError("invalid_output");}
}
export const objectSchema=(properties:Record<string,unknown>):JsonSchema=>({type:"object",properties,required:Object.keys(properties),additionalProperties:false});
