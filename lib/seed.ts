import type { EventRecord } from "./domain";
const guide = "https://www.kumamoto-if.or.jp/kiji0031455/index.html";
const october = "https://www.kumamoto-if.or.jp/kiji0033924/index.html";
const base: EventRecord = {
  id: "", titleEn: "Everyday Japanese conversation", titleJa: "くらしのにほんごくらぶ",
  descriptionEn: "Practice Japanese for daily life with the local class.", descriptionJa: "地域の教室で、生活に使う日本語を練習します。",
  category: "language", startAt: "", endAt: "", venueEn: "Kumamoto City International Center, 2F", venueJa: "熊本市国際交流会館 2階",
  address: "熊本市中央区花畑町4-18", area: "chuo", price: 100, languages: ["ja"],
  englishWelcome: null, beginnerWelcome: null, soloWelcome: null, organizer: "Kumamoto International Foundation",
  bookingUrl: guide, bookingEn: "Register with KIF before attending. Ask about your level and available places: 096-359-2121 or nihongo@kumamoto-if.or.jp.",
  bookingJa: "参加前にKIFで登録してください。レベルと空き状況は電話096-359-2121、またはnihongo@kumamoto-if.or.jpへお問い合わせください。",
  sourceUrl: october, sourceName: "KIF October calendar + class guide", reviewedAt: "2026-10-02T12:00:00.000Z",
  status: "published", origin:"official", sourceId:"kif", recurring: true, audienceEn: "Japanese learners. Ask KIF about the suitable level.", audienceJa: "日本語を学ぶ方。対象レベルはKIFにご確認ください。"
};
function session(id: string, day: number, start: string, end: string, patch: Partial<EventRecord> = {}): EventRecord {
  const date = `2026-10-${String(day).padStart(2, "0")}`;
  return { ...base, ...patch, id, startAt: new Date(`${date}T${start}:00+09:00`).toISOString(), endAt: new Date(`${date}T${end}:00+09:00`).toISOString() };
}
const city = [[4,"10:00","12:00","am"],[4,"14:00","16:00","pm"],[6,"10:00","12:00","am"],[7,"10:00","12:00","am"],[7,"14:00","16:00","pm"],[7,"18:30","20:00","eve"],[10,"14:00","16:00","pm"]] as const;
const classPatch = (titleEn: string,titleJa: string,venueEn: string,venueJa: string,area: string,price: number): Partial<EventRecord> => ({ titleEn,titleJa,venueEn,venueJa,address: venueJa,area,price,sourceUrl:guide });
const kengun = classPatch("Kengun Japanese class","健軍教室","Yottekan-ne, Kengun shopping street","熊本市東区 健軍商店街「よって館ね」","higashi",0);
const musashi = classPatch("Musashigaoka Japanese class","武蔵ヶ丘教室","Kikuyo Seibu Town Community Center","菊陽町 西部町民センター","kikuyo",100);
const ward = [session("kengun-1006",6,"10:00","11:30",kengun),session("kengun-1013",13,"10:00","11:30",kengun),session("musashi-1006",6,"10:00","11:30",musashi),session("musashi-1013",13,"10:00","11:30",musashi),session("higashi-1004",4,"10:00","11:30",classPatch("Higashi Japanese conversation","東区くらしのにほんご","Tobu Community Center","熊本市東区 東部公民館","higashi",0)),session("minami-1004",4,"13:30","15:00",classPatch("Minami Japanese conversation","南区くらしのにほんご","Nanbu Community Center","熊本市南区 南部公民館","minami",0)),session("nishi-1010",10,"13:30","15:00",classPatch("Nishi Japanese conversation","西区くらしのにほんご","Seibu Community Center","熊本市西区 西部公民館","nishi",0)),session("kita-1008",8,"10:00","11:30",classPatch("Kita Japanese class","北区教室","Nirenoki Community Center","熊本市北区 楡木地域コミュニティセンター","kita",100)),session("online-1010",10,"19:00","20:30",{...classPatch("Online Japanese conversation","オンライン日本語おしゃべり会","Online · Zoom","オンライン・Zoom","online",0),address:"",bookingEn:"Contact KIF for registration and the Zoom link: nihongo@kumamoto-if.or.jp.",bookingJa:"参加登録とZoomのリンクはnihongo@kumamoto-if.or.jpへお問い合わせください。"})];
const cafe: Partial<EventRecord> = {
  titleEn:"Canada café",titleJa:"異文化カフェ・カナダ",category:"culture",price:500,
  venueEn:"Link Café, International Center 1F",venueJa:"国際交流会館 1階 リンクカフェ",
  sourceUrl:"https://www.kumamoto-if.or.jp/kiji0033865/index.html",sourceName:"KIF Canada café · October",
  descriptionEn:"Meet the Canadian coordinator and learn about Canada in a one-hour café session.",descriptionJa:"カナダ出身の国際交流員と、カナダについて話す約1時間のカフェです。",
  audienceEn:"People interested in Canada and cultural exchange.",audienceJa:"カナダや国際交流に興味がある方。",
  bookingUrl:"https://www.kumamoto-if.or.jp/dynamic/entry/pub/ansform.aspx?c_id=24&entry_ins=305",
  bookingEn:"Book using KIF's form. If the English evening slot is absent, confirm by phone 096-359-2121 or email koza@kumamoto-if.or.jp.",bookingJa:"KIFのフォームで予約してください。英語の夜の回がない場合は、電話096-359-2121、またはkoza@kumamoto-if.or.jpへお問い合わせください。"
};
const activities = [session("canada-cafe-ja-1008",8,"14:00","15:00",cafe),session("canada-cafe-en-1008",8,"18:30","19:30",{...cafe,titleEn:"Canada café · English session",titleJa:"異文化カフェ・カナダ（英語の回）",languages:["en"],englishWelcome:true,availability:"full",sourceCheckedAt:"2026-10-03T09:03:36.913638Z",bookingEn:"This evening session is full. Contact KIF about a waiting list.",bookingJa:"夜の回は満席です。キャンセル待ちはKIFにご確認ください。"}),session("kids-cafe-1010",10,"10:00","11:30",{titleEn:"Kids' international café",titleJa:"キッズ・カフェ",category:"community",price:0,recurring:false,venueEn:"International Center, 2F lounge",venueJa:"国際交流会館 2階 ラウンジ",descriptionEn:"A cultural activity for elementary and junior-high students with their parents.",descriptionJa:"小・中学生と保護者向けの異文化体験です。",audienceEn:"School-age children with guardians. Siblings aged 5+ join with school-age siblings. Preschool children alone are not eligible.",audienceJa:"小・中学生と保護者。5歳以上の弟妹は小・中学生の兄姉と参加できます。未就学児だけでは参加できません。",sourceUrl:"https://www.kumamoto-if.or.jp/kiji0033874/index.html",sourceName:"KIF Kids café · October",bookingUrl:"https://www.kumamoto-if.or.jp/dynamic/entry/pub/ansform.aspx?c_id=24&entry_ins=314",sourceCheckedAt:"2026-10-03T09:03:36.913638Z",bookingEn:"Select October 10 Kids café on the organizer's registration form. Confirm available places with KIF.",bookingJa:"主催者の申込フォームで10月10日のキッズ・カフェを選んでください。空き状況はKIFにご確認ください。"}),session("hotto-salon-1022",22,"10:00","11:30",{titleEn:"Hotto Salon · parents & children",titleJa:"ほっとサロン・親子の日本語交流会",category:"community",beginnerWelcome:true,descriptionEn:"Chat about parenting and daily life. Japanese skills are not required; staff offer support.",descriptionJa:"子育てや生活について話しましょう。日本語ができなくても大丈夫です。スタッフがサポートします。",audienceEn:"Children aged 0–6 and their parents. Japanese and foreign families welcome. Up to 10 families.",audienceJa:"0〜6歳のお子さんと保護者。外国人、日本人どちらも参加できます。定員10組。",sourceUrl:"https://www.kumamoto-if.or.jp/kiji0032944/index.html",sourceName:"KIF Hotto Salon · October",bookingEn:"Register in advance using the application link on the organizer's page. Registration opens on the 1st of the month.",bookingJa:"主催者ページの申込リンクから事前に申し込んでください。受付は毎月1日からです。",bookingUrl:"https://www.kumamoto-if.or.jp/kiji0032944/index.html"})];
export const seedEvents: EventRecord[] = [...city.map(([day,start,end,slot])=>session(`kif-japanese-10${String(day).padStart(2,"0")}-${slot}`,day,start,end)),...ward,...activities];
