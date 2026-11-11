import {emailRpc} from '@/lib/supabase-rpc';
export async function signIn(email:string,id:string,session:string,tokenHash:string){return emailRpc<boolean>('signin_alumni_member',{email_value:email,challenge_id:id,session_value:session,token_value:tokenHash,now_value:Date.now()});}
export async function logout(hash:string){await emailRpc('logout_alumni_member',{token_value:hash});}
export async function editMember(hash:string,m:Record<string,unknown>){return emailRpc<boolean>('edit_alumni_member',{token_value:hash,payload:m,now_value:Date.now()});}
