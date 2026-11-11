import {audit} from '@/lib/admin-store';
import * as store from '@/lib/engagement-store';
import {cleanActivity,cleanSupport} from '@/lib/engagement-types';
import {adminUser} from '@/lib/admin-auth';
import {emailReady} from '@/lib/email-verification';
import {settings,reply,sameOrigin} from '@/lib/payments';
export const dynamic='force-dynamic';
export async function GET(r:Request){if(!await adminUser(r))return reply({error:'Administrator access required.'},403);try{return reply({activities:await store.activities(true),bookings:await store.adminBookings(),support:await store.getSupport(),reviews:await store.reviewHistory(),emailReady:emailReady(),paymentsReady:settings().enabled,paymentMode:settings().mode});}catch{return reply({error:'Administration could not load.'},503);}}
export async function POST(r:Request){if(Number(r.headers.get('content-length')||0)>24576)return reply({error:'Request too large.'},413);const user=await adminUser(r);if(!sameOrigin(r)||!user)return reply({error:'Administrator access required.'},403);try{const b=await r.json() as Record<string,unknown>;if(b.action==='support'){await store.saveSupport(cleanSupport(b.support as Record<string,string>));await audit(user.email,'support.updated','support');return reply({ok:true});}if(b.action==='activity'){const a=cleanActivity(b.activity as Record<string,unknown>);if(a.status==='published'&&new Date(a.starts_at)<=new Date())return reply({error:'Publish a future date so members can book.'},400);if(!await store.saveActivity(a))return reply({error:'Capacity cannot be lower than the number already booked.'},409);await audit(user.email,'activity.updated',a.id);return reply({ok:true});}return reply({error:'Unknown action.'},400);}catch(e){return reply({error:(e as Error).message||'Unable to save.'},400);}}
