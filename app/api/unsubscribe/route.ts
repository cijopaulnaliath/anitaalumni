import {applyUnsubscribe} from '@/lib/email-campaigns';
import {reply} from '@/lib/payments';
export const dynamic='force-dynamic';
export async function POST(r:Request){try{if(Number(r.headers.get('content-length')||0)>4096)return reply({error:'Request too large.'},413);const token=new URL(r.url).searchParams.get('token')||String((await r.formData()).get('token')||'');if(!await applyUnsubscribe(token))return reply({error:'This unsubscribe link is invalid or no longer matches a registration.'},400);return reply({ok:true,message:'You will no longer receive bulk alumni updates. Account verification emails remain available.'});}catch{return reply({error:'Unable to update email preferences.'},400);}}
