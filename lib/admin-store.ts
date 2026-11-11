import {emailRpc} from '@/lib/supabase-rpc';
import type {AdminMember,Budget,Ledger,Campaign,Recipient,PasswordRecord} from '@/lib/admin-types';
import type {Payment} from '@/lib/payment-types';
async function call<T>(path:string,init:RequestInit={}):Promise<T>{const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Storage unavailable');const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/'+path,{...init,cache:'no-store',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...init.headers}});if(!r.ok)throw Error('Administrator storage request failed');const text=await r.text();return(text?JSON.parse(text):null) as T;}
async function paged<T>(path:string,max=10000):Promise<T[]>{const rows:T[]=[];for(let offset=0;offset<max;offset+=1000){const page=await call<T[]>(path+'&limit=1000&offset='+offset);rows.push(...page);if(page.length<1000)break;}return rows.slice(0,max);}
const post=(body:unknown,extra:Record<string,string>={})=>({method:'POST',headers:{Prefer:'return=minimal',...extra},body:JSON.stringify(body)});
const patch=(body:unknown)=>({method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});
export async function passwordRecord(){const a=await call<{value:string}[]>("site_settings?select=value&key=eq.admin_password");return a[0]?JSON.parse(a[0].value) as PasswordRecord:null;}
export async function setPassword(record:PasswordRecord){await emailRpc('alumni_set_admin_password',{record_value:record});}
export async function loginAttempt(bucket:string){return emailRpc<boolean>('alumni_admin_login_attempt',{bucket_value:bucket,now_value:Date.now()});}
export async function createSession(hash:string,username:string){const now=Date.now();await call('admin_sessions',post({token_hash:hash,username,expires_at:now+28800000,created_at:now}));}
export async function session(hash:string){return(await call<{username:string}[]>('admin_sessions?select=username&token_hash=eq.'+encodeURIComponent(hash)+'&expires_at=gt.'+Date.now()))[0]||null;}
export async function revokeSession(hash:string){await call('admin_sessions?token_hash=eq.'+encodeURIComponent(hash),{method:'DELETE'});}
export async function audit(actor:string,action:string,target:string,detail=''){await call('admin_audit',post({id:crypto.randomUUID(),actor,action,target,detail:detail.slice(0,1000),created:new Date().toISOString()}));}
export async function auditRows(){return call<Record<string,string>[]>('admin_audit?select=*&order=created.desc&limit=300');}
export async function memberRows(){return paged<AdminMember>('members?select=id,name,email,phone,year,level,country,city,profession,verification,enrollment,visible,is_test,email_verified_at,email_updates_opt_in,whatsapp_updates_opt_in,whatsapp_consent_at,fee_commitment_at,archived_at,created&order=created.desc');}
export async function archiveMember(id:string,restore=false){return emailRpc<boolean>('alumni_archive_member',{member_value:id,restore_value:restore});}
export async function financialRows(from:string,to:string,year:number){const [payments,ledger,budgets]=await Promise.all([paged<Payment>('payments?select=*&created=gte.'+encodeURIComponent(from)+'&created=lt.'+encodeURIComponent(to)+'&order=created.desc'),paged<Ledger>('ledger_entries?select=*&date=gte.'+from.slice(0,10)+'&date=lt.'+to.slice(0,10)+'&order=date.desc'),call<Budget[]>('budget_lines?select=*&year=eq.'+year+'&order=category')]);return{payments,ledger,budgets};}
export async function saveBudget(b:Budget){await call('budget_lines?on_conflict=year,category',post(b,{Prefer:'resolution=merge-duplicates,return=minimal'}));}
export async function addLedger(l:Ledger){await call('ledger_entries?on_conflict=id',post(l,{Prefer:'resolution=ignore-duplicates,return=minimal'}));}
export async function voidLedger(id:string){await call('ledger_entries?id=eq.'+encodeURIComponent(id)+'&voided_at=is.null',patch({voided_at:new Date().toISOString()}));}
export async function campaigns(){return emailRpc<Campaign[]>('list_alumni_admin_campaigns',{});}
export async function getCampaign(id:string){return(await call<Campaign[]>('email_campaigns?select=*&id=eq.'+encodeURIComponent(id)))[0]||null;}
export async function saveCampaign(c:Campaign){await call('email_campaigns?on_conflict=id',post(c,{Prefer:'resolution=ignore-duplicates,return=minimal'}));}
export async function eligible(year:number|null){return paged<{id:string;name:string;email:string}>('members?select=id,name,email&archived_at=is.null&is_test=eq.0&email_updates_opt_in=eq.1&verification=eq.approved&email_verified_at=not.is.null&enrollment=eq.alumni'+(year===null?'':'&year=eq.'+year)+'&order=id');}
export async function queueCampaign(id:string){return emailRpc<boolean>('alumni_queue_campaign',{campaign_value:id});}
export async function claimCampaign(id:string){return emailRpc<boolean>('alumni_claim_campaign',{campaign_value:id,now_value:Date.now()});}
export async function pendingRecipients(id:string){return call<Recipient[]>('campaign_recipients?select=*&campaign_id=eq.'+encodeURIComponent(id)+'&status=eq.pending&order=id&limit=20');}
export async function recipientStatus(id:string,status:string,batchId:string|null=null,providerId:string|null=null){await call('campaign_recipients?id=eq.'+encodeURIComponent(id),patch({status,...(batchId?{batch_id:batchId}:{}),...(providerId?{provider_id:providerId}:{}),updated:new Date().toISOString()}));}
export async function finishCampaign(id:string){await emailRpc('alumni_finish_campaign',{campaign_value:id});}
export async function cancelCampaign(id:string){await emailRpc('alumni_cancel_campaign',{campaign_value:id,now_value:Date.now()});}
export async function markUncertain(id:string,batchId:string){await call('campaign_recipients?campaign_id=eq.'+encodeURIComponent(id)+'&batch_id=eq.'+encodeURIComponent(batchId)+'&status=eq.processing',patch({status:'unknown',updated:new Date().toISOString()}));}
export async function unsubscribe(id:string,emailHash:string){const m=(await call<{email:string}[]>('members?select=email&id=eq.'+encodeURIComponent(id)))[0];if(!m)return false;const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(m.email)));if(Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('')!==emailHash)return false;await call('members?id=eq.'+encodeURIComponent(id),patch({email_updates_opt_in:0}));return true;}

export async function campaignDelivery(id:string){return paged<Record<string,unknown>>('campaign_recipients?select=email,status,provider_id,updated&campaign_id=eq.'+encodeURIComponent(id)+'&order=updated.desc');}
