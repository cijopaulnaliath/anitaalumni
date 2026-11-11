import type {Content} from '@/lib/community-types';
async function call(path:string,init:RequestInit={}){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Storage unavailable');const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/'+path,{...init,cache:'no-store',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...init.headers}});if(!r.ok)throw Error('Storage request failed');return r;}
export async function listContent(kind:string,admin=false){return await(await call('community_content?select=*&kind=eq.'+encodeURIComponent(kind)+(admin?'':'&status=eq.published')+'&order=created.desc')).json() as Content[];}
export async function getContent(id:string){return(await(await call('community_content?select=*&id=eq.'+encodeURIComponent(id))).json() as Content[])[0]||null;}
export async function saveContent(c:Content){await call('community_content?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify(c)});}
export async function moderateContent(id:string,status:string){await call('community_content?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status,updated:new Date().toISOString()})});}
export async function pendingMembers(){return await(await call('members?select=id,name,email,phone,year,level,country,city,verification,verification_note,enrollment,email_verified_at,created&archived_at=is.null&is_test=eq.0&order=created.desc&limit=200')).json();}
export async function reviewMember(id:string,status:string,actor:string){await call('members?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({verification:status,reviewed_by:actor,reviewed_at:new Date().toISOString()})});}
export async function recentMessages(){return await(await call('messages?select=*&order=created.desc&limit=100')).json();}
export async function addMessage(m:Record<string,string>){await call('messages',{method:'POST',body:JSON.stringify({...m,status:'new'})});}
export async function messageLimited(email:string){const a=await(await call('messages?select=id&email=eq.'+encodeURIComponent(email)+'&created=gt.'+encodeURIComponent(new Date(Date.now()-3600000).toISOString()))).json() as unknown[];return a.length>=3;}
export async function readMessage(id:string){await call('messages?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({status:'read'})});}

export async function findRegistration(id:string){return(await(await call('members?select=id,email_verified_at,is_test,archived_at&id=eq.'+encodeURIComponent(id))).json() as {id:string;email_verified_at:string|null;is_test:number;archived_at:string|null}[])[0]||null;}
