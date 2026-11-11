import {ownMember} from '@/lib/storage';
import {digest,reply} from '@/lib/payments';
export const dynamic='force-dynamic';
export async function GET(r:Request){
 const token=r.headers.get('cookie')?.match(/(?:^|;\s*)anita_member=([^;]+)/)?.[1];
 if(!token)return reply({member:null});
 try{const member=await ownMember(await digest(token));return reply({member:member?{id:String(member.id),name:String(member.name),hasPhoto:!!member.photo}:null});}
 catch{return reply({error:'Session status is temporarily unavailable.'},503);}
}
