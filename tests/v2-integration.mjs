import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));const {Miniflare}=await import(wranglerRequire.resolve('miniflare'));
const root=path.resolve('dist/server');const modules=['index.js',...(await readdir(root,{recursive:true})).filter(x=>/\.m?js$/.test(x)&&x!=='index.js')].map(x=>({type:'ESModule',path:path.join(root,x)}));
const cafe=await readFile('tests/fixtures/cafe.html','utf8');const kids=await readFile('tests/fixtures/kids.html','utf8');const newCafe=await readFile('tests/fixtures/new-cafe.html','utf8');
const requests=[];let extractionEvent;let providerFailure=false;let sourceFailure=false;
const outbound=async request=>{const u=new URL(request.url);
 if(u.hostname==='api.openai.com'||u.hostname==='api.anthropic.com'){
  const b=await request.json();requests.push({host:u.hostname,body:b});if(providerFailure)return new Response('{}',{status:429});
  const schema=b.text?.format?.schema??b.output_config?.format?.schema;let data;
  if(schema.properties.category)data={category:'culture',date:'any',price:'under1000',area:'all',english:true,beginner:false,solo:false};
  else if(schema.properties.answer)data={answer:'Here are published cultural activities within your budget.',eventIds:['official-invalid','canada-cafe-en-1008']};
  else if(schema.properties.sessions)data=extractionEvent?{sessions:[{...extractionEvent,evidence:{date:'10月22日',time:'10時-11時30分',venue:'国際交流会館',fee:'100円'}}],issues:[]}:{sessions:[],issues:['No confirmed session times.']};
  else data={issues:[]};
  return Response.json(u.hostname==='api.openai.com'?{status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(data)}]}]}:{stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(data)}]});
 }
 if(u.hostname==='www.kumamoto-if.or.jp'){
  if(sourceFailure)return new Response('unavailable',{status:503});
  const body=u.pathname==='/kiji0033865/index.html'?cafe:u.pathname==='/kiji0033874/index.html'?kids:u.pathname==='/kiji0039999/index.html'?newCafe:u.pathname==='/kiji0032944/index.html'?'<article><div>2026年10月22日</div><h1>ほっとサロン</h1><p>10月22日 10時-11時30分</p><p>国際交流会館 100円</p></article>':u.pathname==='/new_list.xml'?'<rss><item><link>https://www.kumamoto-if.or.jp/kiji0039999/index.html</link></item></rss>':'<a href="/kiji0039999/index.html">New café</a>';
  return new Response(body,{headers:{'content-type':u.pathname.endsWith('.xml')?'text/xml':'text/html'}});
 }
 throw new Error('Unexpected outbound host '+u.hostname);
};
const mf=new Miniflare({modules,modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'kuma-v2-isolated'},outboundService:outbound,bindings:{REVIEWER_EMAILS:'reviewer@example.com',SITE_ORIGIN:'https://test.local'}});
try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort()){const sql=await readFile('drizzle/'+f,'utf8');for(const statement of sql.replace(/--> statement-breakpoint/g,'').split(';').map(x=>x.trim()).filter(Boolean))await db.prepare(statement).run();}
 const owner={'oai-authenticated-user-id':'reviewer','oai-authenticated-user-email':'reviewer@example.com'};const fetch=(route,options)=>mf.dispatchFetch('https://test.local'+route,options);const post=(route,body,headers={})=>fetch(route,{method:'POST',headers:{Origin:'https://test.local','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 for(const route of ['/ask','/review','/privacy'])assert.equal((await fetch(route)).status,200);
 assert.equal((await post('/api/imports',{})).status,403);assert.equal((await fetch('/api/imports')).status,403);assert.equal((await fetch('/api/reports')).status,403);
 let r=await post('/api/imports',{},owner);assert.equal(r.status,200);let run=await r.json();assert.equal(run.status,'succeeded');assert.equal(run.created,2);let events=(await (await fetch('/api/events')).json()).events;assert.equal(events.length,22);assert.equal(events.find(e=>e.id==='canada-cafe-en-1008').availability,'full');assert.ok(events.find(e=>e.id==='kids-cafe-1010').bookingUrl.endsWith('entry_ins=314'));
 assert.ok(events.every(e=>!('sourceHash'in e)&&!('importIssues'in e)&&!('managedByImport'in e)));
 r=await post('/api/imports',{},owner);assert.equal(r.status,200);assert.equal((await r.json()).created,0);assert.equal((await (await fetch('/api/events')).json()).events.length,22);console.log('PASS official imports, availability, current booking links and duplicate prevention');
 r=await post('/api/assistant',{query:'English, under 1000 yen',lang:'en'});assert.equal(r.status,200);let answer=await r.json();assert.equal(answer.mode,'catalog');assert.ok(answer.events.length);assert.ok(answer.events.every(e=>e.price<1000&&e.englishWelcome===true&&e.availability!=='full'));console.log('PASS honest keyless catalogue helper and confirmed filters');
 const modelSettings={provider:'openai',openaiModel:'gpt-4.1-mini',claudeModel:'claude-haiku-4-5',autoPublish:true,aiImports:true,dailyAiLimit:100};await db.prepare('INSERT INTO app_settings (key,data) VALUES (?,?)').bind('preferences',JSON.stringify(modelSettings)).run();
 await mf.setOptions({modules,modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'kuma-v2-isolated'},outboundService:outbound,bindings:{REVIEWER_EMAILS:'reviewer@example.com',SITE_ORIGIN:'https://test.local',OPENAI_API_KEY:'TEST_ONLY_OPENAI',ANTHROPIC_API_KEY:'TEST_ONLY_CLAUDE'}});
 extractionEvent=events.find(e=>e.id==='hotto-salon-1022');r=await post('/api/imports',{},owner);assert.equal(r.status,200);const imported=(await (await fetch('/api/review',{headers:owner})).json()).events.find(e=>e.id==='hotto-salon-1022');assert.equal(imported.status,'pending');assert.ok(imported.agentSummary.includes('Human approval'));assert.ok(requests.some(x=>x.body.text?.format?.name==='verify_official_sessions'));console.log('PASS extraction and verification agents leave official AI entries pending');
 for(const provider of ['openai','claude']){r=await post('/api/assistant',{query:'Find English cultural activities under 1000 yen',lang:'en',provider});assert.equal(r.status,200);answer=await r.json();assert.equal(answer.mode,provider);assert.ok(answer.events.length);assert.ok(answer.events.every(e=>e.id!=='official-invalid'&&e.availability!=='full'));}
 assert.ok(requests.some(x=>x.host==='api.openai.com'));assert.ok(requests.some(x=>x.host==='api.anthropic.com'));assert.ok(requests.filter(x=>x.host==='api.openai.com').every(x=>x.body.store===false));console.log('PASS OpenAI and Claude structured planning/explanation with unknown-ID rejection');
 r=await post('/api/reports',{eventId:events[0].id,reason:'incorrect',details:'Please check the current location.',website:''});assert.equal(r.status,201);const report=await r.json();r=await fetch('/api/reports',{headers:owner});assert.equal(r.status,200);assert.equal((await r.json()).reports[0].id,report.id);console.log('PASS private reports and reviewer access');
 r=await post('/mcp',{jsonrpc:'2.0',id:1,method:'tools/list'});assert.equal(r.status,200);assert.equal((await r.json()).result.tools.length,2);
 r=await post('/mcp',{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'refresh_official_activities',arguments:{}}});assert.equal(r.status,403);
 r=await post('/mcp',{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'refresh_official_activities',arguments:{}}},owner);assert.equal(r.status,200);assert.equal(JSON.parse((await r.json()).result.content[0].text).status,'not_due');console.log('PASS unattended updater tools enforce reviewer identity and due time');
 const selected=events.find(e=>e.id==='canada-cafe-ja-1008');await fetch('/api/review',{method:'PATCH',headers:{...owner,Origin:'https://test.local','Content-Type':'application/json'},body:JSON.stringify({id:selected.id,event:{...selected,titleEn:'Reviewer corrected title'},status:'published',confirmed:true})});
 r=await post('/api/imports',{},owner);assert.equal(r.status,200);events=(await (await fetch('/api/events')).json()).events;assert.equal(events.find(e=>e.id===selected.id).titleEn,'Reviewer corrected title');console.log('PASS manual corrections survive source imports');
 sourceFailure=true;r=await post('/api/imports',{},owner);assert.equal((await r.json()).status,'partial');assert.equal((await (await fetch('/api/events')).json()).events.length,21);sourceFailure=false;console.log('PASS failed source fetches preserve existing listings');
 providerFailure=true;r=await post('/api/assistant',{query:'English cultural activities',lang:'en',provider:'openai'});assert.equal(r.status,503);assert.equal((await r.json()).error,'provider_limit');assert.ok(!JSON.stringify(requests).includes('reviewer@example.com'));console.log('PASS provider errors stay private and recoverable');
 console.log('All v2 workflow checks passed using isolated D1 and mocked provider/source responses.');
}finally{await mf.dispose();}
