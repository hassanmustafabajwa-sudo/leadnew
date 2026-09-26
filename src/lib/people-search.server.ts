import { webSearch, type WebResult } from "./online-search.server";
import { generateJson } from "./ai-provider.server";

export type PersonResult = {
 full_name:string; job_title:string|null; company_name:string; location:string|null; linkedin_url:string|null;
 professional_email:string|null; professional_phone:string|null; company_website:string|null; source_urls:string[];
 evidence:string; confidence:"high"|"medium"|"low"; target_service:string|null; headline?:string|null;
 company_url?:string|null; industry?:string|null; seniority?:string|null; company_email?:string|null; company_phone?:string|null;
};
const GENERIC=/^(info|hello|contact|sales|support|admin|office|careers|jobs|team|mail|enquiries|inquiries)@/i;
const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/ig;
function email(v:string|null){if(!v||GENERIC.test(v))return null;return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?v.toLowerCase():null;}
function contacts(rs:WebResult[]){const t=rs.map(r=>r.title+" "+r.description).join(" ");const e=[...(t.match(EMAIL_RE)||[])].map(x=>x.toLowerCase()).filter(x=>!GENERIC.test(x));const phones=t.match(/(?:\+?\d[\d ()\-]{6,}\d)/g)||[];return {email:email(e[0]||null),phone:phones[0]?.trim()||null};}
async function discover(query:string,role:string,location:string,service:string,limit:number,linkedin:boolean):Promise<PersonResult[]>{
 const qs=linkedin
 ? ["site:linkedin.com/in "+query+" "+role+" "+location,"site:linkedin.com/in "+query+" "+location+" "+service]
 : [query+" "+role+" "+location+" founder CEO owner","\""+query+"\" "+service+" "+location+" leadership","\""+query+"\" team founder director"];
 const all:WebResult[]=[]; for(const q of qs){try{all.push(...await webSearch(q,10));}catch{}}
 const unique=[...new Map(all.map(x=>[x.url,x])).values()].slice(0,30); if(!unique.length)return [];
 const schema={type:"object",properties:{people:{type:"array",items:{type:"object",properties:{
 full_name:{type:"string"},job_title:{type:["string","null"]},company_name:{type:"string"},location:{type:["string","null"]},
 linkedin_url:{type:["string","null"]},evidence:{type:"string"},confidence:{type:"string",enum:["high","medium","low"]},
 headline:{type:["string","null"]},company_url:{type:["string","null"]},industry:{type:["string","null"]},seniority:{type:["string","null"]}
 },required:["full_name","job_title","company_name","location","linkedin_url","evidence","confidence","headline","company_url","industry","seniority"],additionalProperties:false}}},required:["people"],additionalProperties:false};
 const src=unique.map((r,i)=>"SOURCE "+(i+1)+"\\nURL: "+r.url+"\\nTITLE: "+r.title+"\\nDESCRIPTION: "+r.description).join("\\n\\n");
 let parsed:any; try{parsed=await generateJson({provider:"lovable",system:"Extract only real professional people supported by the supplied public sources. Never invent data.",prompt:"Find decision makers for "+query+" in "+location+". Role: "+role+". Service: "+service+". Mode: "+(linkedin?"linkedin-public-web":"decision-maker")+"\\n"+src,schema,schemaName:"people_discovery"});}catch{return []}
 return (parsed.people||[]).map((p:any)=>{const rs=unique.filter(r=>(r.title+" "+r.description).toLowerCase().includes(String(p.full_name).split(" ")[0].toLowerCase())||r.description.toLowerCase().includes(String(p.company_name).toLowerCase()));const ss=rs.length?rs:unique.slice(0,2);return {
 full_name:String(p.full_name).trim(),job_title:p.job_title||null,company_name:String(p.company_name).trim(),location:p.location||location||null,
 linkedin_url:p.linkedin_url&&/linkedin\.com\\/in\\//i.test(p.linkedin_url)?p.linkedin_url:null,professional_email:contacts(ss).email,professional_phone:contacts(ss).phone,
 company_website:null,source_urls:ss.map(r=>r.url),evidence:p.evidence||"Public source identified this person and company.",confidence:p.confidence,target_service:service||null,
 headline:p.headline||null,company_url:p.company_url||null,industry:p.industry||null,seniority:p.seniority||null,company_email:null,company_phone:null
 };}).slice(0,limit);
}
export async function searchDecisionMakers(a:{query:string;role:string;location:string;targetService:string;limit:number}){return discover(a.query,a.role,a.location,a.targetService,a.limit,false);}
export async function searchLinkedInLeads(a:{query:string;role:string;location:string;targetService:string;limit:number}){return discover(a.query,a.role,a.location,a.targetService,a.limit,true);}
export async function enrichPersonContact(a:{full_name:string;company_name:string;company_url?:string|null;linkedin_url?:string|null}){
 const qs=["\""+a.full_name+"\" \""+a.company_name+"\" email","\""+a.full_name+"\" \""+a.company_name+"\" contact"];
 if(a.linkedin_url)qs.push("\""+a.full_name+"\" "+a.linkedin_url);
 const all:WebResult[]=[];for(const q of qs){try{all.push(...await webSearch(q,8));}catch{}}
 const found=contacts(all);return {professional_email:found.email,professional_phone:found.phone,source_urls:[...new Set(all.map(x=>x.url))].slice(0,10),evidence:all.length?"Contact data found in public web research; verify before outreach.":"No public professional contact detail found."};
}