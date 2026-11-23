import {reply,sameOrigin,digest} from '@/lib/payments';
import {sessionToken,sessionHash} from '@/lib/email-verification';
import {normalizePhone} from '@/lib/registration-fields';
import {phoneReady,allowedPhone,sendPhoneCode,checkPhoneCode} from '@/lib/phone-verification';
import * as store from '@/lib/phone-store';
import {ownMember} from '@/lib/storage';
export const dynamic='force-dynamic';
export async function GET(){return reply({enabled:await phoneReady(),expiresIn:600,resendAfter:60})}
export async function POST(r:Request){
 if(!sameOrigin(r))return reply({error:'Verify from this website.'},403);
 if(Number(r.headers.get('content-length')||0)>4096)return reply({error:'Request too large.'},413);
 let pending='';
 try{
  if(!await phoneReady())return reply({error:'SMS verification is not connected yet. Please use email verification.'},503);
  const b=await r.json() as Record<string,unknown>,phone=normalizePhone(String(b.phone||'')),purpose=String(b.purpose||'');
  if(!phone||!['registration','signin','attach'].includes(purpose))return reply({error:'Enter a phone number with + and country code and choose a verification purpose.'},400);
  if(!allowedPhone(phone))return reply({error:'SMS is not available for this country yet. Please use email.'},400);
  const memberToken=r.headers.get('cookie')?.match(/(?:^|;\s*)anita_member=([^;]+)/)?.[1];
  const owner=purpose==='attach'&&memberToken?await ownMember(await digest(memberToken)):null;
  if(purpose==='attach'&&(!owner||owner.is_test))return reply({error:'Sign in before linking a phone.'},401);
  if(b.action==='send'){
   if(b.consent!==true)return reply({error:'Confirm that this is your phone and you agree to receive a verification SMS.'},400);
   const secret=sessionToken(r)||crypto.randomUUID()+crypto.randomUUID(),session=await digest(secret),id=crypto.randomUUID(),now=Date.now(),ip=r.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||session;
   if(!await store.reservePhone({id,phone,purpose,session_hash:session,ip_hash:await digest(ip),sent_at:now}))return reply({error:'Please wait 60 seconds before resending. SMS requests are limited. Try email or return later.'},429);
   pending=id;const sid=await sendPhoneCode(phone);
   if(!await store.activatePhone(id,sid))throw Error('This SMS request expired. Request a new code.');pending='';
   return new Response(JSON.stringify({ok:true,challengeId:id,expiresIn:600,resendAfter:60}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':`anita_verify_session=${secret}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`}});
  }
  const session=await sessionHash(r),id=String(b.challengeId||'');
  if(!session||!/^[a-f0-9-]{36}$/.test(id))return reply({error:'Request a new code in this browser.'},400);
  if(b.action==='verify'){
   const code=String(b.code||'');if(!/^\d{6}$/.test(code))return reply({error:'Enter the six-digit SMS code.'},400);
   const challenge=await store.attemptPhone(id,phone,session,purpose as store.PhonePurpose);
   if(!challenge)return reply({error:'This code expired, was used, or reached its attempt limit. Request a new code.'},400);
   if(!await checkPhoneCode(phone,challenge.provider_sid!,code)||!await store.markPhone(id,challenge.provider_sid!))return reply({error:'The code is incorrect or expired. Please check the SMS or request a new code.'},400);
   return reply({ok:true,challengeId:id});
  }
  if(b.action==='attach'&&purpose==='attach'){
   if(!await store.attachPhone(await digest(memberToken!),phone,id,session))return reply({error:'Phone verification expired. Request a new code.'},400);
   return reply({ok:true});
  }
  return reply({error:'Unknown verification action.'},400);
 }catch(e){if(pending)await store.invalidatePhone(pending).catch(()=>{});const message=String((e as Error).message);return reply({error:message.includes('PHONE_EXISTS')?'This phone is already associated with a registration. Contact the alumni team.':'SMS verification could not be completed. Try email or request a new SMS later.'},503)}
}
