import type { Metadata } from "next";
import {LanguageProvider} from "./shell";
import "./globals.css";
export const metadata:Metadata={title:"KumaConnect | Local activities in Kumamoto",description:"Find Japanese classes, cultural activities and community events in Kumamoto. Browse in English or Japanese, check joining details, and share a local plan.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"},openGraph:{title:"KumaConnect",description:"Find and join local activities in Kumamoto.",type:"website",locale:"en_GB",alternateLocale:["ja_JP"]}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><LanguageProvider>{children}</LanguageProvider></body></html>;}
