import { db,ensureSeed,saveEvent } from "./events";
import { sha256,preferences,apiKey } from "./settings";
import { sources,approvedUrl,type Source } from "./sources";
import { discover,documentOf,parseKnownActivity } from "./import-parsers";
import { extractionAgent,agentError } from "./import-agents";
import type { EventRecord } from "./domain";
export type RunResult={id:string;status:string;startedAt:string;finishedAt?:string;checked:number;created:number;updated:number;drafts:number;errors:string[];agents:string[]};
async function boundedText(response:Response,max=1000000){if(!response.body)throw new Error("Empty source response");const reader=response.body.getReader();let bytes=0;const chunks:Uint8Array[]=[];try{for(;;){const next=await reader.read();if(next.done)break;bytes+=next.value.length;if(bytes>max)throw new Error("Source exceeds the size limit");chunks.push(next.value);}}finally{await reader.cancel();}const out=new Uint8Array(bytes);let i=0;for(const c of chunks){out.set(c,i);i+=c.length;}return out;}
async function sourceFetch(url:string,source:Source,kind:"article"|"document"|"discovery"="article") {
 if(!approvedUrl(url,source,kind))throw new Error("Source URL is not approved");const r=await fetch(url,{headers:{Accept:kind==="document"?"application/pdf":"text/html,application/rss+xml,application/xml,text/xml","User-Agent":"KumaConnect/2.0 (+official-source activity summaries)"},redirect:"manual",signal:AbortSignal.timeout(15000)});
 if(!r.ok){await r.body?.cancel();throw new Error(`Source responded ${r.status}; existing listings were preserved`);}const type=r.headers.get("content-type")??"";if(kind==="document"?!type.includes("pdf"):!/html|xml|text\/plain/.test(type)){await r.body?.cancel();throw new Error("Unexpected source format");}return boundedText(r,kind==="document"?2000000:1000000);
}
async function pageState(url:string,source:Source,data:unknown,hash:string|null=null,processed=false) {const now=new Date().toISOString();await db().prepare("INSERT INTO import_pages (url,source_id,hash,checked_at,processed_at,data) VALUES (?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET hash=COALESCE(excluded.hash,hash),checked_at=excluded.checked_at,processed_at=COALESCE(excluded.processed_at,processed_at),data=excluded.data").bind(url,source.id,hash,now,processed?now:null,JSON.stringify(data)).run();}
async function applyImported(e:EventRecord,hash:string,result:RunResult,auto:boolean) {
 const prior=await db().prepare("SELECT data,status FROM events WHERE json_extract(data,'$.sourceUrl')=? AND start_at=? ORDER BY created_at LIMIT 1").bind(e.sourceUrl,e.startAt).first<{data:string;status:EventRecord["status"]}>();
 const old=prior?{...JSON.parse(prior.data),status:prior.status} as EventRecord:null;
 // Never undo a reviewer's archive/rejection, overwrite a manually edited
 // listing, or merge a public submission merely because it claims KIF.
 if(old&&!auto&&old.status==="published"&&old.sourceHash===hash)return;
 if(old&&(old.origin==="community"||!!old.contactEmail||old.managedByImport===false||old.status==="archived"||old.status==="rejected"))return;
 const now=new Date().toISOString();const record:EventRecord={...old,...e,id:old?.id??"official-"+(await sha256(e.sourceUrl+"|"+e.startAt)).slice(0,24),status:e.status==="archived"?"archived":auto?"published":"pending",reviewedAt:auto?now:old?.reviewedAt??null,sourceCheckedAt:now,sourceHash:hash,createdAt:old?.createdAt??now,managedByImport:true};
 if(old){const saved=await db().prepare("UPDATE events SET status=?,start_at=?,end_at=?,data=?,updated_at=? WHERE id=? AND data=? AND status NOT IN ('archived','rejected')").bind(record.status,record.startAt,record.endAt,JSON.stringify(record),now,record.id,prior!.data).run();if(saved.meta.changes)result.updated++;}
 else {await saveEvent(record,true);result.created++;}if(record.status==="pending")result.drafts++;
}
export async function runImports(force=false):Promise<RunResult> {
 await ensureSeed();const now=Date.now();const id=crypto.randomUUID();const locked=await db().prepare("INSERT INTO job_locks (key,owner,expires_at) VALUES ('official-import',?,?) ON CONFLICT(key) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE expires_at < ? RETURNING owner").bind(id,now+15*60000,now).first<{owner:string}>();
 if(!locked)return {id,status:"busy",startedAt:new Date().toISOString(),checked:0,created:0,updated:0,drafts:0,errors:[],agents:[]};
 const result:RunResult={id,status:"running",startedAt:new Date().toISOString(),checked:0,created:0,updated:0,drafts:0,errors:[],agents:["Source discovery","Rule validation"]};
 try{const last=await db().prepare("SELECT started_at FROM import_runs WHERE status IN ('succeeded','partial') ORDER BY started_at DESC LIMIT 1").first<{started_at:string}>();if(!force&&last&&now-Date.parse(last.started_at)<6*3600000){result.status="not_due";return result;}
 await db().prepare("INSERT INTO import_runs (id,started_at,status,data) VALUES (?,?,?,?)").bind(id,result.startedAt,"running",JSON.stringify(result)).run();const prefs=await preferences();let aiDocuments=0;
 for(const source of sources){const candidates=new Set<string>();const rows=await db().prepare("SELECT data FROM events WHERE end_at > ? AND json_extract(data,'$.sourceUrl') LIKE ? AND COALESCE(json_extract(data,'$.origin'),'official') != 'community'").bind(new Date().toISOString(),"https://"+source.host+"/%").all<{data:string}>();for(const row of rows.results){const url=JSON.parse(row.data).sourceUrl;if(approvedUrl(url,source))candidates.add(url);}
 const date=new Date(Date.now()+9*3600000);const calendars=[0,1].map(offset=>{const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+offset,1));return `https://${source.host}/dynamic/hpkiji/pub/Calendar.aspx?c_id=3&mst=109&selm=${d.getUTCMonth()+1}&sely=${d.getUTCFullYear()}`;});
 for(const url of [source.feedUrl,...source.discoveryUrls,...calendars]){try{for(const u of discover(new TextDecoder().decode(await sourceFetch(url,source,"discovery")),source))candidates.add(u);}catch(error){result.errors.push(`${source.name}: ${error instanceof Error?error.message:"Discovery failed"}`);}}
 const cached=await db().prepare("SELECT url,hash,checked_at,data FROM import_pages WHERE source_id=?").bind(source.id).all<{url:string;hash:string;checked_at:string;data:string}>();const map=new Map(cached.results.map(x=>[x.url,x]));
 const urls=[...candidates].sort((a,b)=>(Date.parse(map.get(a)?.checked_at??"")||0)-(Date.parse(map.get(b)?.checked_at??"")||0)).slice(0,12);
 for(const url of urls){result.checked++;try{const html=new TextDecoder().decode(await sourceFetch(url,source));const doc=documentOf(html,url);const hash=await sha256(doc.text+JSON.stringify(doc.links));const cache=map.get(url);const past=cache?JSON.parse(cache.data):null;
 if(cache?.hash===hash&&past?.processed&&!force){await pageState(url,source,{...past,lastCheck:"unchanged"},hash);continue;}
 if(/報告|終了しました/.test(doc.title)){await pageState(url,source,{title:doc.title,issues:[],processed:true,note:"Past report, skipped"},hash,true);continue;}
 const parsed=parseKnownActivity(doc);let events:EventRecord[]=[];let issues:string[]=[];let automatic=false;
 if(parsed!==null){events=parsed;automatic=prefs.autoPublish;}else if(/カレンダー|日本語教室|カフェ|サロン|体験|研修|英会話|セミナー|相談会|交流/.test(doc.title)){
 if(apiKey(prefs.provider)&&prefs.aiImports&&aiDocuments>=2){await pageState(url,source,{title:doc.title,issues:["Queued for the next AI extraction batch."],processed:false},hash);continue;}
 if(apiKey(prefs.provider)&&prefs.aiImports)aiDocuments++;
 let pdf:{data:string;name:string}|undefined;const pdfUrl=doc.pdfs.find(u=>approvedUrl(u,source,"document"));if(pdfUrl&&prefs.aiImports&&apiKey(prefs.provider)&&/カレンダー/.test(doc.title)){const bytes=await sourceFetch(pdfUrl,source,"document");let raw="";for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));pdf={data:btoa(raw),name:"official-calendar.pdf"};}
 const extracted=await extractionAgent(doc,source,pdf);events=extracted.events;issues=extracted.issues;if(extracted.agent!=="not_configured")result.agents.push("AI extraction","AI verification");
 }else{await pageState(url,source,{title:doc.title,issues:[],processed:true,note:"Non-activity article, skipped"},hash,true);continue;}
 if(automatic&&events.length){const oldSessions=await db().prepare("SELECT data,status FROM events WHERE json_extract(data,'$.sourceUrl')=? AND end_at > ?").bind(url,new Date().toISOString()).all<{data:string;status:EventRecord["status"]}>();const starts=new Set(events.map(e=>e.startAt));for(const row of oldSessions.results){const old={...JSON.parse(row.data),status:row.status} as EventRecord;if(!starts.has(old.startAt)&&old.origin!=="community"&&!old.contactEmail&&old.managedByImport!==false&&old.status==="published"){const archived={...old,status:"archived",sourceCheckedAt:new Date().toISOString(),importIssues:["This session was replaced by the updated official schedule."]};await db().prepare("UPDATE events SET status='archived',data=?,updated_at=? WHERE id=? AND data=? AND status='published'").bind(JSON.stringify(archived),new Date().toISOString(),old.id,row.data).run();}}}
 for(const e of events)await applyImported(e,hash,result,automatic);
 // Conflicting/changed source details must stop an outdated official listing
 // from being promoted by the assistant, until a reviewer resolves them.
 if(!automatic&&cache&&cache.hash!==hash){const affected=await db().prepare("SELECT data,status FROM events WHERE json_extract(data,'$.sourceUrl')=? AND end_at > ?").bind(url,new Date().toISOString()).all<{data:string;status:EventRecord["status"]}>();for(const row of affected.results){const old={...JSON.parse(row.data),status:row.status} as EventRecord;if(old.origin!=="community"&&!old.contactEmail&&old.managedByImport!==false&&old.status==="published"){await saveEvent({...old,status:"pending",sourceCheckedAt:new Date().toISOString(),importIssues:["Official page changed. Recheck the dates, availability and conditions.",...issues]});result.drafts++;}}}
 await pageState(url,source,{title:doc.title,issues,processed:automatic||events.length>0,agent:automatic?"Tested source adapter":"AI draft / review",eventCount:events.length},hash,automatic||events.length>0);
 }catch(error){const message=error instanceof Error&&!(error.name==="ZodError")?error.message:agentError(error);result.errors.push(`${url}: ${message}`);await pageState(url,source,{issues:[message],processed:false});}}
 }
 result.status=result.errors.length?"partial":"succeeded";
 }catch{result.status="failed";result.errors.push("Import service could not finish. Existing records were preserved.");}
 finally{result.finishedAt=new Date().toISOString();result.agents=[...new Set(result.agents)];if(result.status!=="not_due")await db().prepare("UPDATE import_runs SET finished_at=?,status=?,data=? WHERE id=?").bind(result.finishedAt,result.status,JSON.stringify(result),id).run();await db().prepare("DELETE FROM job_locks WHERE key='official-import' AND owner=?").bind(id).run();}
 return result;
}
export async function importStatus(){const [runs,pages]=await Promise.all([db().prepare("SELECT data FROM import_runs ORDER BY started_at DESC LIMIT 10").all<{data:string}>(),db().prepare("SELECT url,checked_at,data FROM import_pages ORDER BY checked_at DESC LIMIT 60").all<{url:string;checked_at:string;data:string}>()]);return {sources:sources.map(s=>({id:s.id,name:s.name,feedUrl:s.feedUrl})),runs:runs.results.map(x=>JSON.parse(x.data)),pages:pages.results.map(x=>({url:x.url,checkedAt:x.checked_at,...JSON.parse(x.data)}))};}
