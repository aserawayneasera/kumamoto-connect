import { z } from "zod";
const content = (max: number) => z.string().trim().min(1).max(max);
export const safeUrl = z.string().trim().url().max(1500).refine(v=>{try{const u=new URL(v);return u.protocol==="https:"&&!u.username&&!u.password;}catch{return false;}},"Use an HTTPS link");
export const eventInput = z.object({
  titleEn:content(160),titleJa:content(160),descriptionEn:content(2500),descriptionJa:content(2500),
  category:z.enum(["language","culture","community","sports","volunteering","outdoors"]),
  startAt:z.string().datetime(),endAt:z.string().datetime(),venueEn:content(200),venueJa:content(200),address:z.string().trim().max(300),
  area:z.enum(["chuo","higashi","nishi","minami","kita","kikuyo","online","other"]),price:z.number().int().min(0).max(100000).nullable(),
  languages:z.array(z.enum(["en","ja","zh","ko","other"])).min(1).max(5),englishWelcome:z.boolean().nullable(),beginnerWelcome:z.boolean().nullable(),soloWelcome:z.boolean().nullable(),
  organizer:content(150),bookingUrl:safeUrl,bookingEn:content(1500),bookingJa:content(1500),sourceUrl:safeUrl,sourceName:content(200),
  recurring:z.boolean(),audienceEn:content(700),audienceJa:content(700)
}).refine(e=>Date.parse(e.endAt)>Date.parse(e.startAt),"End time must follow start time").refine(e=>Date.parse(e.endAt)-Date.parse(e.startAt)<=7*86400000,"Use a single session, up to seven days");
export const submissionInput = z.object({event:eventInput,contactName:content(100),contactEmail:z.string().trim().email().max(200),consent:z.literal(true),website:z.string().max(0)});
