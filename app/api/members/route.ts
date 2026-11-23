import {phoneReady} from '@/lib/phone-verification';
import {phoneExists,phoneProof,registerPhone} from '@/lib/phone-store';
import {after} from 'next/server';
import {directorySearch,hasDirectorySearch,matchesDirectorySearch} from '@/lib/directory-search';
import {directoryFilters} from '@/lib/storage';
import {notifyRegistration} from '@/lib/association-notifications';
import {sendWelcome} from '@/lib/welcome-email';
import { allMembers,ownMember,addMember,removeMember,putPhoto,deletePhoto,emailExists } from '@/lib/storage';
import {normalizePhone,participationOptions,duplicateEmailMessage} from '@/lib/registration-fields';
import {hasProof,hasTestProof} from '@/lib/email-store';
import {sessionHash,emailTestMode} from '@/lib/email-verification';
import {validatePhoto} from '@/lib/profile-photo';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
async function hash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
function token(r:Request){return r.headers.get('cookie')?.match(/(?:^|;\s*)anita_member=([^;]+)/)?.[1]||'';}
function sameOrigin(r:Request){const origin=r.headers.get('origin');return !origin||origin===new URL(r.url).origin;}
export async function GET(r:Request){try{if(new URL(r.url).searchParams.has('me'))return json({member:token(r)?await ownMember(await hash(token(r))):null});const search=directorySearch(new URL(r.url).searchParams);if(!hasDirectorySearch(search))return json({members:[],searchRequired:true,...await directoryFilters()});const matches=(await allMembers()).filter(m=>matchesDirectorySearch(m,search));return json({members:matches.slice(0,200),total:matches.length,hasMore:matches.length>200,searchRequired:false});}catch{return json({error:'The directory is temporarily unavailable. Please try again.'},503);}}
export async function POST(r:Request){
 if(!sameOrigin(r))return json({error:'Please submit from this website.'},403);
 if(Number(r.headers.get('content-length')||0)>4*1024*1024)return json({error:'Please choose a photo under 3 MB.'},413);
 let photoKey='',registrationSaved=false;try{
 const f=await r.formData();const get=(k:string,max:number)=>String(f.get(k)||'').trim().slice(0,max);
 const method=get('verificationMethod',10)||'email';if(!['email','sms'].includes(method))return json({error:'Choose email or SMS verification.'},400);const sms=method==='sms';if(sms&&!await phoneReady())return json({error:'SMS verification is awaiting setup. Use email verification.'},503);
 const phone=normalizePhone(get('phone',40)),country=get('country',100),enrollment=get('enrollment',10);
 const participation=f.getAll('participation').map(String).filter(x=>(participationOptions as readonly string[]).includes(x));
 const name=get('name',100),email=get('email',150).toLowerCase(),year=Number(get('year',4)),level=get('level',60),city=get('city',100),profession=get('profession',100),bio=get('bio',400);
 if(get('website',100))return json({error:'Unable to register.'},400);
 if(/^\S+@\S+\.\S+$/.test(email)&&await emailExists(email))return json({error:duplicateEmailMessage,code:'EMAIL_EXISTS',field:'email'},409);
 if(!phone)return json({error:'Include your phone country code, for example +91 98765 43210.'},400);
 if(!city)return json({error:'Enter your current city or town.',field:'city'},400);
 if(enrollment==='alumni'&&f.get('feeCommitment')!=='yes')return json({error:'Confirm that you will pay the ₹1,000 membership fee after school approval.',field:'feeCommitment'},400);
 if(name.length<2||(!sms&&!/^\S+@\S+\.\S+$/.test(email))||(sms&&!!email&&!/^\S+@\S+\.\S+$/.test(email))||!Number.isInteger(year)||year<1970||year>new Date().getFullYear()||!level||!phone||!country||!profession||!['alumni','event'].includes(enrollment)||f.get('consent')!=='yes')return json({error:'Please complete the required fields and confirm the consent boxes.'},400);
 if(sms&&phone&&await phoneExists(phone))return json({error:'This phone is already associated with a registration. Sign in by email to link SMS access, or contact the alumni team.',code:'PHONE_EXISTS'},409);
 const proofId=get(sms?'phoneChallengeId':'emailChallengeId',36),session=await sessionHash(r);if(!/^[a-f0-9-]{36}$/.test(proofId)||!session)return json({error:'Verify your selected email or phone in this browser before registering.'},400);
 if(!(sms?await phoneProof(proofId,phone!,session,'registration'):await hasProof(proofId,email,session)))return json({error:'Contact verification expired or does not match. Please request and verify a new code.'},400);
 const testingRegistration=!sms&&emailTestMode()&&await hasTestProof(proofId,email,session);
 if(!testingRegistration&&token(r)&&await ownMember(await hash(token(r))))return json({error:'You already have a profile on this browser. Sign out in My account before registering another person.',code:'PROFILE_EXISTS'},409);
 const id=crypto.randomUUID(),secret=crypto.randomUUID()+crypto.randomUUID();const p=f.get('photo');
 if(p instanceof File&&p.size){
 let validated;try{validated=await validatePhoto(p);}catch(e){return json({error:(e as Error).message},400)}const {data,type}=validated;
 photoKey='members/'+id;await putPhoto(photoKey,data,type);
 }
 const interests=f.getAll('interests').map(String).filter(x=>['Mentoring','Community service','School on Wheels','Reunions','School support','Alumni work opportunities'].includes(x));
 const payload={id,name,email,whatsappUpdates:f.get('whatsappUpdates')==='yes'?1:0,whatsappConsentAt:f.get('whatsappUpdates')==='yes'?new Date().toISOString():null,feeCommitmentAt:enrollment==='alumni'?new Date().toISOString():null,emailUpdates:f.get('emailUpdates')==='yes'?1:0,verificationNote:get('verificationNote',400),phone,country,participation:JSON.stringify(participation),enrollment,year,level,city,profession,bio,interests:JSON.stringify(interests),photo:photoKey||null,visible:enrollment==='alumni'?1:0,tokenHash:await hash(secret),created:new Date().toISOString()};const saved=sms?await registerPhone(payload,proofId,session):await addMember(payload,{id:proofId,session});
 if(!saved){if(photoKey)await deletePhoto(photoKey);return json({error:'Contact verification expired or does not match this registration. Go back and verify your selected email or phone again.'},400);}
 registrationSaved=true;
 const origin=new URL(r.url).origin;
 after(async()=>{await Promise.all([sendWelcome(id,origin).catch(()=> 'pending'),notifyRegistration({id,name,email,year,level,city,country,isTest:testingRegistration,verificationMethod:method}).catch(()=> 'unknown')]);});
 const welcomeStatus=sms?'phone':testingRegistration?'test':'pending',adminNotificationStatus='pending';
 return new Response(JSON.stringify({ok:true,id,welcomeStatus,adminNotificationStatus}),{status:201,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':`anita_member=${secret}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`}});
 }catch(e){if(photoKey&&!registrationSaved)await deletePhoto(photoKey).catch(()=>{});if(/PHONE_EXISTS/i.test(String(e)))return json({error:'This phone is already associated with a registration.',code:'PHONE_EXISTS'},409);if(/unique|duplicate|23505/i.test(String(e)))return json({error:duplicateEmailMessage,code:'EMAIL_EXISTS',field:'email'},409);return json({error:'We could not save your registration. Please try again.'},400);}
}
export async function DELETE(r:Request){if(!sameOrigin(r))return json({error:'Invalid request.'},403);if(!token(r)||!await ownMember(await hash(token(r))))return json({error:'Sign in to manage your profile.'},401);await removeMember(await hash(token(r)));return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':'anita_member=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'}});}
