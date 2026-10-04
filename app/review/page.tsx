import {getChatGPTUser,chatGPTSignInPath} from "@/app/chatgpt-auth";
import {reviewer} from "@/lib/auth";
import ReviewApp from "./review-app";
export const dynamic="force-dynamic";
export default async function Page(){const user=await getChatGPTUser();if(!user)return <ReviewApp access="signin" signinPath={chatGPTSignInPath("/review")}/>;if(!await reviewer())return <ReviewApp access="denied"/>;return <ReviewApp access="allowed"/>;}
