import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { searchDecisionMakers, searchLinkedInLeads, enrichPersonContact } from "./people-search.server";

const Input=z.object({query:z.string().trim().min(2).max(160),role:z.string().max(80).default("Other"),location:z.string().max(120).default(""),targetService:z.string().max(120).default(""),limit:z.number().int().min(1).max(50).default(20)});

async function saveUnique(db:any, table:string, rows:any[], userId:string) {
  if(!rows.length) return [];
  const {data:existing}=await db.from(table).select("id,full_name,company_name,linkedin_url").eq("user_id",userId).limit(5000);
  const seen=new Set((existing||[]).map((x:any)=>(String(x.linkedin_url||x.full_name)+"|"+String(x.company_name)).toLowerCase()));
  const fresh=rows.filter((x:any)=>{const key=(String(x.linkedin_url||x.full_name)+"|"+x.company_name).toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});
  if(!fresh.length)return [];
  const {data,error}=await db.from(table).insert(fresh.map(x=>({...x,user_id:userId}))).select("*");
  if(error)throw new Error("Could not save results: "+error.message);
  return data||[];
}

export const searchDecisionMakersFn=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>Input.parse(d)).handler(async({data,context})=>{
  const rows=await searchDecisionMakers(data); const saved=await saveUnique(context.supabase,"decision_makers",rows,context.userId); return {results:saved.length?saved:rows};
});
export const searchLinkedInLeadsFn=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>Input.parse(d)).handler(async({data,context})=>{
  const rows=await searchLinkedInLeads(data); const saved=await saveUnique(context.supabase,"linkedin_leads",rows,context.userId); return {results:saved.length?saved:rows};
});

const Enrich=z.object({id:z.string().uuid(),full_name:z.string(),company_name:z.string(),company_url:z.string().nullable().optional(),linkedin_url:z.string().nullable().optional(),table:z.enum(["decision_makers","linkedin_leads"])});
export const enrichPersonContactFn=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>Enrich.parse(d)).handler(async({data,context})=>{
  const found=await enrichPersonContact(data); const db:any=context.supabase;
  const {error}=await db.from(data.table).update({...found,updated_at:new Date().toISOString()}).eq("id",data.id).eq("user_id",context.userId);
  if(error)throw new Error("Could not save enrichment: "+error.message);
  return found;
});