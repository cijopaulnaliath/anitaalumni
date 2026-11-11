import {emailRpc} from '@/lib/supabase-rpc';
// Server-only Vercel adapter. Never expose the service role key to the browser.
const columns='id,name,year,level,city,country,profession,bio,interests,photo,visible';
function config(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Supabase environment variables are missing');return{url:url.replace(/\/$/,''),key};}
async function call(path:string,init:RequestInit={}){const {url,key}=config();const r=await fetch(url+path,{...init,cache:'no-store',headers:{apikey:key,Authorization:`Bearer ${key}`,...init.headers}});if(!r.ok)throw Error(await r.text());return r;}
async function rows(query:string){return await(await call('/rest/v1/members?'+query)).json() as Record<string,unknown>[];}
export async function allMembers(){return rows('select='+columns+'&archived_at=is.null&is_test=eq.0&visible=eq.1&verification=eq.approved&email_verified_at=not.is.null&order=created.desc');}
export async function ownMember(hash:string){return (await rows('select='+columns+',token_expires_at,is_test,email_updates_opt_in,whatsapp_updates_opt_in,whatsapp_consent_at,fee_commitment_at,email,phone,participation,enrollment,email_verified_at,verification,verification_note&archived_at=is.null&token_hash=eq.'+encodeURIComponent(hash)+'&or=(token_expires_at.is.null,token_expires_at.gt.'+Date.now()+')'))[0]||null;}
export async function addMember(m:Record<string,unknown>,proof:{id:string;session:string}){return emailRpc<boolean>('register_alumni_verified_member',{payload:m,challenge_id:proof.id,session_value:proof.session,now_value:Date.now()});}

export async function deletePhoto(key:string){await call('/storage/v1/object/alumni-photos/'+key,{method:'DELETE'});}
export async function removeMember(hash:string){const m=(await rows('select=id,photo&token_hash=eq.'+encodeURIComponent(hash)))[0];if(!m)return false;await emailRpc('remove_alumni_account',{token_value:hash});if(m.photo)await deletePhoto(String(m.photo));return true;}
export async function putPhoto(key:string,data:ArrayBuffer,type:string){await call('/storage/v1/object/alumni-photos/'+key,{method:'POST',headers:{'Content-Type':type,'x-upsert':'true'},body:data});}
export async function readPhoto(id:string,tokenHash=""){if(tokenHash&&!await ownMember(tokenHash))tokenHash='';const m=(await rows('select=photo&id=eq.'+encodeURIComponent(id)+'&or=(and(archived_at.is.null,is_test.eq.0,visible.eq.1,verification.eq.approved,email_verified_at.not.is.null),token_hash.eq.'+encodeURIComponent(tokenHash||'no_owner')+')'))[0];if(!m?.photo)return null;const r=await call('/storage/v1/object/authenticated/alumni-photos/'+m.photo);return{body:r.body,type:r.headers.get('content-type')||'image/jpeg'};}

export async function setMemberPhoto(hash:string,key:string|null){await call('/rest/v1/members?token_hash=eq.'+encodeURIComponent(hash),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({photo:key})});}

export async function readStoredImage(key:string){const r=await call('/storage/v1/object/authenticated/alumni-photos/'+key);return{body:r.body,type:r.headers.get('content-type')||'image/jpeg'};}
export async function emailExists(email:string){return emailRpc<boolean>('alumni_email_exists',{email_value:email.trim().toLowerCase()});}

export async function registrationKind(email:string){const m=(await rows('select=is_test,archived_at&email=eq.'+encodeURIComponent(email)))[0];return !m?'missing':m.archived_at?'removed':m.is_test===1?'test':'live';}
