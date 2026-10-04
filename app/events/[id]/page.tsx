import {env} from "cloudflare:workers";
import {getEvent} from "@/lib/events";
import {notFound} from "next/navigation";
import EventDetail from "@/app/event-detail";
export const dynamic="force-dynamic";
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {id}=await params;const event=await getEvent(id);return {title:event?`${event.titleEn} | KumaConnect`:"Activity | KumaConnect",description:event?.descriptionEn};}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const event=await getEvent(id);if(!event)notFound();return <EventDetail event={event} origin={(env as unknown as {SITE_ORIGIN?:string}).SITE_ORIGIN??""}/>;}
