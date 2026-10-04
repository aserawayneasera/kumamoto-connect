import type { EventRecord } from "./domain";
import { canonicalArticle, sources, type Source } from "./sources";
export function decode(value:string) {return value.replace(/&(?:nbsp|amp|lt|gt|quot|apos);|&#(?:x[0-9a-f]+|\d+);/gi,x=>{const named:Record<string,string>={"&nbsp;":" ","&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;":"'"};if(named[x.toLowerCase()])return named[x.toLowerCase()];const n=x.toLowerCase().startsWith("&#x")?parseInt(x.slice(3,-1),16):parseInt(x.slice(2,-1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):"";});}
export function plain(html:string) {return decode(html.replace(/<!--[^]*?-->/g,"").replace(/<(script|style|noscript)\b[^>]*>[^]*?<\/\1>/gi,"").replace(/<\/?(?:p|div|h[1-6]|li|tr|br|article|section)\b[^>]*>/gi,"\n").replace(/<[^>]*>/g," ")).normalize("NFKC").replace(/[ \t]+/g," ").replace(/\n\s*\n/g,"\n").trim();}
export function discover(html:string,source:Source=sources[0]) {const found=new Set<string>();for(const match of html.matchAll(/(?:href\s*=\s*["']([^"']+)["']|<link>\s*(?:<!\[CDATA\[)?([^<]+))/gi)){const u=canonicalArticle(decode(match[1]??match[2]??""),source);if(u)found.add(u);}return [...found];}
export function documentOf(html:string,url:string) {
 const article=html.match(/<article\b[^>]*>([^]*?)<\/article>/i)?.[1]??html;
 const title=plain(article.match(/<h1\b[^>]*>([^]*?)<\/h1>/i)?.[1]??"");
 const before=article.split(/<h1\b/i)[0];const d=plain(before).match(/(20\d\d)年\s*(\d{1,2})月\s*(\d{1,2})日/);
 const eventDate=d?`${d[1]}-${d[2].padStart(2,"0")}-${d[3].padStart(2,"0")}`:null;
 const text=plain(article).replace(/最終更新日[:：][^\n]+/g,"").slice(0,16000);
 const links=[...article.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(m=>{try{return new URL(decode(m[1]),url).href;}catch{return "";}}).filter(Boolean);
 const pdfs=[...new Set(links.filter(u=>/\.pdf(?:$|\?)/i.test(u)))];
 return {title,text,eventDate,links,pdfs,url};
}
export type Document = ReturnType<typeof documentOf>;
const countries:Record<string,string>={カナダ:"Canada",イタリア:"Italy",中国:"China",韓国:"Korea",ウクライナ:"Ukraine",ドイツ:"Germany",フランス:"France",メキシコ:"Mexico",台湾:"Taiwan"};
export function parseCafe(doc:Document,now=new Date()):EventRecord[]|null {
 if(!doc.title.startsWith("異文化カフェ")||/報告|終了しました/.test(doc.title))return null;
 const date=doc.eventDate;if(!date)return null;
 const text=doc.text.replace(/[ \t　]/g,"");const timeLine=text.match(/日[時程][:：]([^\n]+)/)?.[1];const venue=text.match(/会場[:：]([^\n]+)/)?.[1];const fee=text.match(/参加費[:：]([\d,]+)円/);
 if(!timeLine||!venue||!fee||!/国際交流会館.*リンクカフェ/.test(venue))return null;
 const day=timeLine.match(/(\d{1,2})月(\d{1,2})日/);if(!day||Number(date.slice(5,7))!==+day[1]||Number(date.slice(8,10))!==+day[2])return null;
 // Require an explicit session duration, explicit language, and one event date.
 if(!/各?1時間(?:程度)?/.test(timeLine))return null;
 const times=[...timeLine.matchAll(/(午前|午後)?(\d{1,2})時(?:(\d{1,2})分)?[（(](日本語|英語)で進行[）)]/g)];if(!times.length||times.length>3)return null;
 const booking=doc.links.find(x=>x.startsWith("https://www.kumamoto-if.or.jp/dynamic/entry/pub/ansform.aspx?"));if(!booking)return null;
 const country=Object.keys(countries).find(x=>doc.title.includes(x));const label=country?countries[country]:"International";const output:EventRecord[]=[];
 for(const m of times){let hour=Number(m[2]);if(m[1]==="午後"&&hour<12)hour+=12;if(m[1]==="午前"&&hour===12)hour=0;const minute=Number(m[3]??0);if(hour>23||minute>59)return null;
 const startAt=new Date(`${date}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00+09:00`).toISOString();const endAt=new Date(Date.parse(startAt)+3600000).toISOString();if(Date.parse(endAt)<=now.getTime())continue;
 const en=m[4]==="英語";
 const full=(hour>=17&&/夜の部[^\n]*(?:定員に達|受付を終了)/.test(text))||/全(?:て|枠|回)[^\n]*(?:満席|定員に達)/.test(text);
 const cancelled=text.split("\n").some(line=>/イベント(?:は|を)?中止|開催中止|開催を中止/.test(line)&&!/場合|とき|際は|雨天|天候/.test(line));
 output.push({id:"",titleEn:`${label} café · ${en?"English":"Japanese"} session`,titleJa:`${doc.title.trim()}・${en?"英語":"日本語"}の回`,descriptionEn:`A one-hour cultural café about ${label}. Read the organizer’s page for the full program.`,descriptionJa:`${country??"異文化"}について交流する約1時間のカフェです。詳しい内容は主催者ページをご確認ください。`,category:"culture",startAt,endAt,venueEn:"Link Café, International Center 1F",venueJa:venue,address:"熊本市中央区花畑町4-18",area:"chuo",price:Number(fee[1].replace(/,/g,"")),languages:[en?"en":"ja"],englishWelcome:en?true:null,beginnerWelcome:null,soloWelcome:null,organizer:sources[0].organizer,bookingUrl:booking,bookingEn:full?"This session is full. Contact the organizer about a waiting list.":"Register through the organizer’s application form. Confirm available places before attending.",bookingJa:full?"この回は満席です。キャンセル待ちは主催者にご確認ください。":"主催者の申込フォームで予約し、空き状況をご確認ください。",sourceUrl:doc.url,sourceName:"KIF official activity page",reviewedAt:null,status:cancelled?"archived":"published",recurring:false,audienceEn:"People interested in cultural exchange.",audienceJa:"異文化交流に興味がある方。",origin:"official",sourceId:"kif",managedByImport:true,availability:cancelled?"cancelled":full?"full":"unknown"});
 }
 return output;
}

export function parseKnownActivity(doc:Document,now=new Date()):EventRecord[]|null {
 const cafe=parseCafe(doc,now);if(cafe!==null)return cafe;
 if(!/^キッズ[・･]?カフェ/.test(doc.title)||!doc.eventDate||/報告|終了しました/.test(doc.title))return null;
 const text=doc.text.replace(/[ \t　]/g,"");const schedule=text.match(/日時[:：]([^\n]+)/)?.[1];const venue=text.match(/会場[:：]([^\n]+)/)?.[1];
 if(!schedule||!venue||!/国際交流会館2Fラウンジ/.test(venue)||!/参加費[:：]無料/.test(text)||!/小[・、,]?中学生/.test(text))return null;
 const day=schedule.match(/(\d{1,2})月(\d{1,2})日/);const clock=schedule.match(/午前(\d{1,2})時(?:(\d{1,2})分)?[-〜~–](\d{1,2})時(?:(\d{1,2})分)?/);
 if(!day||!clock||+day[1]!==+doc.eventDate.slice(5,7)||+day[2]!==+doc.eventDate.slice(8,10))return null;
 const time=(h:string,m:string|undefined)=>`${doc.eventDate}T${h.padStart(2,"0")}:${(m??"0").padStart(2,"0")}:00+09:00`;const startAt=new Date(time(clock[1],clock[2])).toISOString();const endAt=new Date(time(clock[3],clock[4])).toISOString();
 if(Date.parse(endAt)<=Date.parse(startAt))return null;if(Date.parse(endAt)<=now.getTime())return [];
 const booking=doc.links.find(x=>x.startsWith("https://www.kumamoto-if.or.jp/dynamic/entry/pub/ansform.aspx?"));if(!booking)return null;
 return [{id:"",titleEn:"Kids’ international café",titleJa:doc.title,descriptionEn:"A cultural activity for school-age children and their guardians. Read the organizer’s page for the current program.",descriptionJa:"小・中学生と保護者の異文化体験です。今回の内容は主催者ページをご確認ください。",category:"community",startAt,endAt,venueEn:"International Center, 2F lounge",venueJa:venue,address:"熊本市中央区花畑町4-18",area:"chuo",price:0,languages:["other"],englishWelcome:null,beginnerWelcome:null,soloWelcome:null,organizer:sources[0].organizer,bookingUrl:booking,bookingEn:"Register using the organizer’s application form. Confirm language support and places with KIF.",bookingJa:"主催者の申込フォームから予約し、使用言語と空き状況をKIFにご確認ください。",sourceUrl:doc.url,sourceName:"KIF official Kids café page",reviewedAt:null,status:"published",recurring:false,audienceEn:"Elementary and junior-high students with guardians. Check the source for sibling and preschool participation conditions.",audienceJa:"小・中学生と保護者。弟妹や未就学児の参加条件は主催者ページをご確認ください。",origin:"official",sourceId:"kif",managedByImport:true,availability:"unknown"}];
}
