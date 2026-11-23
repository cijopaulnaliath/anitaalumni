import {emailRpc} from './supabase-rpc';
export type PhonePurpose='registration'|'signin'|'attach';
export type PhoneChallenge={id:string;phone:string;purpose:PhonePurpose;provider_sid:string|null;session_hash:string;ip_hash:string;sent_at:number;expires_at:number;attempts:number;verified_at:number|null;consumed_at:number|null};
let schemaCheck:{until:number;ready:boolean}|null=null;
export async function phoneSchemaReady(){if(process.env.PHONE_OTP_ENABLED!=='true')return false;if(schemaCheck&&schemaCheck.until>Date.now())return schemaCheck.ready;let ready=false;try{ready=await emailRpc<number>('alumni_phone_auth_version',{})===1}catch{}schemaCheck={until:Date.now()+30000,ready};return ready}
export async function phoneColumns(){return await phoneSchemaReady()?',phone_verified_at':''}
export async function verifiedContactFilter(){return await phoneSchemaReady()?'or=(email_verified_at.not.is.null,phone_verified_at.not.is.null)':'email_verified_at=not.is.null'}
export async function phoneExists(phone:string){return emailRpc<boolean>('alumni_phone_exists',{phone_value:phone})}
export async function reservePhone(c:Record<string,unknown>){return emailRpc<boolean>('reserve_alumni_phone_challenge',{challenge:c})}
export async function activatePhone(id:string,sid:string){return emailRpc<boolean>('activate_alumni_phone_challenge',{challenge_id:id,sid_value:sid,now_value:Date.now()})}
export async function attemptPhone(id:string,phone:string,session:string,purpose:PhonePurpose){return(await emailRpc<PhoneChallenge[]>('attempt_alumni_phone_challenge',{challenge_id:id,phone_value:phone,session_value:session,purpose_value:purpose,now_value:Date.now()}))[0]||null}
export async function markPhone(id:string,sid:string){return emailRpc<boolean>('mark_alumni_phone_verified',{challenge_id:id,sid_value:sid,now_value:Date.now()})}
export async function invalidatePhone(id:string){await emailRpc('invalidate_alumni_phone_challenge',{challenge_id:id,now_value:Date.now()})}
export async function phoneProof(id:string,phone:string,session:string,purpose:PhonePurpose){return emailRpc<boolean>('has_alumni_phone_proof',{challenge_id:id,phone_value:phone,session_value:session,purpose_value:purpose,now_value:Date.now()})}
export async function registerPhone(payload:Record<string,unknown>,id:string,session:string){return emailRpc<boolean>('register_alumni_phone_member',{payload,challenge_id:id,session_value:session,now_value:Date.now()})}
export async function signInPhone(phone:string,id:string,session:string,token:string){return emailRpc<boolean>('signin_alumni_phone_member',{phone_value:phone,challenge_id:id,session_value:session,token_value:token,now_value:Date.now()})}
export async function attachPhone(token:string,phone:string,id:string,session:string){return emailRpc<boolean>('attach_alumni_verified_phone',{token_value:token,phone_value:phone,challenge_id:id,session_value:session,now_value:Date.now()})}
export async function attachNewEmail(token:string,email:string,id:string,session:string){return emailRpc<boolean>('add_alumni_verified_email',{token_value:token,email_value:email,challenge_id:id,session_value:session,now_value:Date.now()})}
