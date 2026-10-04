"use client";
import { createContext,useContext,useEffect,useState,type ReactNode } from "react";
import Link from "next/link";
import { Compass,Plus,Globe,MapPin } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import type { Lang } from "@/lib/domain";
const Language = createContext<{lang:Lang;setLang:(lang:Lang)=>void}>({lang:"en",setLang:()=>{}});
export const useLanguage=()=>useContext(Language);
export const useText=()=>{const {lang}=useLanguage();return (en:string,ja:string)=>lang==="ja"?ja:en;};
export function LanguageProvider({children}:{children:ReactNode}){
  const [lang,setState]=useState<Lang>("en");
  useEffect(()=>{const q=new URLSearchParams(location.search).get("lang");const saved=localStorage.getItem("kumaconnect-language");const value=q==="ja"||q==="en"?q:saved==="ja"?"ja":"en";setState(value);document.documentElement.lang=value;},[]);
  const setLang=(value:Lang)=>{setState(value);localStorage.setItem("kumaconnect-language",value);document.documentElement.lang=value;const url=new URL(location.href);url.searchParams.set("lang",value);history.replaceState(null,"",url);};
  return <Language.Provider value={{lang,setLang}}>{children}<Toaster position="bottom-center" richColors /></Language.Provider>;
}
export function Header(){const {lang,setLang}=useLanguage();const t=useText();return <header className="site-header"><div className="header-inner"><Link href={`/?lang=${lang}`} className="brand" aria-label="KumaConnect"><span className="brand-mark"><Compass size={23} strokeWidth={2}/></span><span>Kuma<span className="brand-accent">Connect</span><small>KUMAMOTO · 熊本</small></span></Link><nav aria-label={t("Main navigation","メインメニュー")}><Link href={`/?lang=${lang}`} className="nav-browse">{t("Activities","イベント")}</Link><Link href={`/ask?lang=${lang}`} className="nav-ask">{t("Ask Kuma","Kumaに相談")}</Link><Link href={`/submit?lang=${lang}`} className="submit-link"><Plus size={17}/><span>{t("Submit an activity","イベントを投稿")}</span></Link><div className="language-toggle" aria-label={t("Language","言語")}><Globe size={16}/><button onClick={()=>setLang("en")} aria-pressed={lang==="en"}>EN</button><button onClick={()=>setLang("ja")} aria-pressed={lang==="ja"}>日本語</button></div></nav></div></header>;}
export function Footer(){const t=useText();const {lang}=useLanguage();return <footer className="site-footer"><span><MapPin size={14}/>{t("Made for local life in Kumamoto.","熊本の地域生活に。")}</span><div><Link href={`/privacy?lang=${lang}`}>{t("About & privacy","このアプリ・個人情報")}</Link><Link href={`/review?lang=${lang}`}>{t("Reviewer access","管理者ページ")}</Link></div></footer>;}
export default function Shell({children}:{children:ReactNode}){return <><Header/>{children}<Footer/></>;}
