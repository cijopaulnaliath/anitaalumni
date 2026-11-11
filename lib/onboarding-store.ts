import {emailRpc} from '@/lib/supabase-rpc';
export type GoogleSession={state_hash:string;browser_hash:string;ip_hash:string;verifier:string;nonce:string;expires_at:number;created_at:number;consumed_at:number|null};
export async function reserveGoogle(session:GoogleSession){return emailRpc<boolean>('reserve_alumni_google',{session_value:session});}
export async function consumeGoogle(state:string,browser:string){return(await emailRpc<GoogleSession[]>('consume_alumni_google',{state_value:state,browser_value:browser,now_value:Date.now()}))[0]||null;}
export async function googleSignIn(email:string,sub:string,hash:string){return emailRpc<boolean>('signin_alumni_google',{email_value:email,sub_value:sub,hash_value:hash,now_value:Date.now()});}
export async function claimWelcome(id:string){return emailRpc<boolean>('claim_alumni_welcome',{member_value:id});}
export async function welcomeMember(id:string){return(await emailRpc<{id:string;name:string;email:string;enrollment:string;is_test:number;archived_at:string|null;email_verified_at:string|null}[]>('get_alumni_welcome_member',{member_value:id}))[0]||null;}
export async function finishWelcome(id:string,status:string,provider:string|null=null){await emailRpc('finish_alumni_welcome',{member_value:id,status_value:status,provider_value:provider});}
export async function welcomeRows(){return emailRpc<Record<string,unknown>[]>('list_alumni_welcomes',{});}
export async function pendingWelcomes(){return emailRpc<{member_id:string}[]>('pending_alumni_welcomes',{});}
