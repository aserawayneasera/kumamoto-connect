export type Source = { id:string; name:string; organizer:string; host:string; feedUrl:string; discoveryUrls:string[]; bookingHosts:string[] };
// Each new organization needs its own tested adapter and approved hosts. Names
// supplied by public submitters never grant official-source status.
export const sources:Source[]=[{id:"kif",name:"Kumamoto International Foundation",organizer:"Kumamoto International Foundation",host:"www.kumamoto-if.or.jp",feedUrl:"https://www.kumamoto-if.or.jp/new_list.xml",discoveryUrls:["https://www.kumamoto-if.or.jp/list00109.html"],bookingHosts:["www.kumamoto-if.or.jp","forms.gle","docs.google.com"]}];
export function approvedUrl(value:string,source:Source,kind:"article"|"document"|"discovery"="article") {
 try {const u=new URL(value);if(u.protocol!=="https:"||u.hostname!==source.host||u.username||u.password||u.port)return false;
 return kind==="discovery"?true:kind==="document"?/^\/kiji\d+\/[^/]+\.pdf$/i.test(u.pathname):/^\/kiji\d+\/index\.html$/i.test(u.pathname); }catch{return false;}
}
export function canonicalArticle(value:string,source:Source) {
 try{const u=new URL(value,"https://"+source.host);if(u.hostname!==source.host||u.protocol!=="https:")return null;
 if(/\/dynamic\/hpkiji\/pub\/detail\.aspx$/i.test(u.pathname)&&u.searchParams.get("c_id")==="3"&&/^\d+$/.test(u.searchParams.get("id")??""))u.pathname="/kiji003"+u.searchParams.get("id")+"/index.html";
 u.search="";u.hash="";return approvedUrl(u.href,source)?u.href:null;}catch{return null;}
}
