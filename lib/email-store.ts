export type Challenge={id:string;email:string;session_hash:string;ip_hash:string;code_hash:string;expires_at:number;attempts:number;sent_at:number;verified_at:number|null;consumed_at:number|null;is_test?:number};
import {emailRpc} from '@/lib/supabase-rpc';

export async function reserveChallenge(c:Challenge){return emailRpc<boolean>('reserve_alumni_email_challenge',{challenge:c});}
export async function attemptChallenge(id:string,email:string,session:string){return(await emailRpc<Challenge[]>('attempt_alumni_email_challenge',{challenge_id:id,email_value:email,session_value:session,now_value:Date.now()}))[0]||null;}
export async function markVerified(id:string){return emailRpc<boolean>('mark_alumni_email_verified',{challenge_id:id,now_value:Date.now()});}
export async function invalidateChallenge(id:string){await emailRpc('invalidate_alumni_email_challenge',{challenge_id:id,now_value:Date.now()});}
export async function attachVerifiedEmail(memberId:string,email:string,id:string,session:string){return emailRpc<boolean>('attach_alumni_verified_email',{member_id:memberId,email_value:email,challenge_id:id,session_value:session,now_value:Date.now()});}

export async function hasProof(id:string,email:string,session:string){return emailRpc<boolean>('has_alumni_email_proof',{challenge_id:id,email_value:email,session_value:session,now_value:Date.now()});}

export async function hasTestProof(id:string,email:string,session:string){return emailRpc<boolean>('has_alumni_test_email_proof',{challenge_id:id,email_value:email,session_value:session,now_value:Date.now()});}
