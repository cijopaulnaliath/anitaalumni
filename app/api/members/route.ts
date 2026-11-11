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
export async function GET(r:Request){try{if(new URL(r.url).searchParams.has('me'))return json({member:token(r)?await ownMember(await hash(token(r))):null});return json({members:await allMembers()});}catch{return json({error:'The directory is temporarily unavailable. Please try again.'},503);}}
export async function POST(r:Request){
 if(!sameOrigin(r))return json({error:'Please submit from this website.'},403);
 if(Number(r.headers.get('content-length')||0)>4*1024*1024)return json({error:'Please choose a photo under 3 MB.'},413);
 let photoKey='';try{
 const f=await r.formData();const get=(k:string,max:number)=>String(f.get(k)||'').trim().slice(0,max);
 const phone=normalizePhone(get('phone',40)),country=get('country',100),enrollment=get('enrollment',10);
 const participation=f.getAll('participation').map(String).filter(x=>(participationOptions as readonly string[]).includes(x));
 const name=get('name',100),email=get('email',150).toLowerCase(),year=Number(get('year',4)),level=get('level',60),city=get('city',100),profession=get('profession',100),bio=get('bio',400);
 if(get('website',100))return json({error:'Unable to register.'},400);
 if(/^\S+@\S+\.\S+$/.test(email)&&await emailExists(email))return json({error:duplicateEmailMessage,code:'EMAIL_EXISTS',field:'email'},409);
 if(!phone)return json({error:'Include your phone country code, for example +91 98765 43210.'},400);
 if(!city)return json({error:'Enter your current city or town.',field:'city'},400);
 if(enrollment==='alumni'&&f.get('feeCommitment')!=='yes')return json({error:'Confirm that you will pay the ₹1,000 membership fee after school approval.',field:'feeCommitment'},400);
 if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||!Number.isInteger(year)||year<1970||year>new Date().getFullYear()||!level||!phone||!country||!profession||!['alumni','event'].includes(enrollment)||f.get('consent')!=='yes')return json({error:'Please complete the required fields and confirm the consent boxes.'},400);
 const proofId=get('emailChallengeId',36),session=await sessionHash(r);if(!/^[a-f0-9-]{36}$/.test(proofId)||!session)return json({error:'Verify your email address with the code sent to your inbox before registering.'},400);
 if(!await hasProof(proofId,email,session))return json({error:'Email verification expired or does not match. Please request and verify a new code.'},400);
 const testingRegistration=emailTestMode()&&await hasTestProof(proofId,email,session);
 if(!testingRegistration&&token(r)&&await ownMember(await hash(token(r))))return json({error:'You already have a profile on this browser. Sign out in My account before registering another person.',code:'PROFILE_EXISTS'},409);
 const id=crypto.randomUUID(),secret=crypto.randomUUID()+crypto.randomUUID();const p=f.get('photo');
 if(p instanceof File&&p.size){
 let validated;try{validated=await validatePhoto(p);}catch(e){return json({error:(e as Error).message},400)}const {data,type}=validated;
 photoKey='members/'+id;await putPhoto(photoKey,data,type);
 }
 const interests=f.getAll('interests').map(String).filter(x=>['Mentoring','Community service','School on Wheels','Reunions','School support','Alumni work opportunities'].includes(x));
 const saved=await addMember({id,name,email,whatsappUpdates:f.get('whatsappUpdates')==='yes'?1:0,whatsappConsentAt:f.get('whatsappUpdates')==='yes'?new Date().toISOString():null,feeCommitmentAt:enrollment==='alumni'?new Date().toISOString():null,emailUpdates:f.get('emailUpdates')==='yes'?1:0,verificationNote:get('verificationNote',400),phone,country,participation:JSON.stringify(participation),enrollment,year,level,city,profession,bio,interests:JSON.stringify(interests),photo:photoKey||null,visible:enrollment==='alumni'&&f.get('visible')==='yes'?1:0,tokenHash:await hash(secret),created:new Date().toISOString()},{id:proofId,session});
 if(!saved){if(photoKey)await deletePhoto(photoKey);return json({error:'Email verification expired or does not match this registration. Go back and verify your email again.'},400);}
 const welcomeStatus=await sendWelcome(id,new URL(r.url).origin).catch(()=> 'pending');
 return new Response(JSON.stringify({ok:true,id,welcomeStatus}),{status:201,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':`anita_member=${secret}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`}});
 }catch(e){if(photoKey)await deletePhoto(photoKey).catch(()=>{});if(/unique|duplicate|23505/i.test(String(e)))return json({error:duplicateEmailMessage,code:'EMAIL_EXISTS',field:'email'},409);return json({error:'We could not save your registration. Please try again.'},400);}
}
export async function DELETE(r:Request){if(!sameOrigin(r))return json({error:'Invalid request.'},403);if(!token(r)||!await ownMember(await hash(token(r))))return json({error:'Sign in to manage your profile.'},401);await removeMember(await hash(token(r)));return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':'anita_member=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'}});}
