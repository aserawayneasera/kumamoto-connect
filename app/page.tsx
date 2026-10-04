import ConnectApp from "./connect-app";
import { listEvents } from "@/lib/events";
export const dynamic = "force-dynamic";
export default async function Home(){try{return <ConnectApp initialEvents={await listEvents()} />;}catch(e){console.error("Event database unavailable",e);return <ConnectApp initialEvents={[]} initialError />;}}
