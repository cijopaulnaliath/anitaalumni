import {emailRpc} from '@/lib/supabase-rpc';
import {emptySupport,type Activity,type Support,type Booking} from '@/lib/engagement-types';
async function call<T>(path:string,init:RequestInit={}):Promise<T>{const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw Error('Storage unavailable');const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/'+path,{...init,cache:'no-store',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...init.headers}});if(!r.ok)throw Error('Storage request failed');const text=await r.text();return(text?JSON.parse(text):null) as T;}
export async function getSupport():Promise<Support>{const r=await call<{value:string}[]>("site_settings?select=value&key=eq.support");return{...emptySupport,...(r[0]?JSON.parse(r[0].value):{})};}
export async function saveSupport(s:Support){await call('site_settings?on_conflict=key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({key:'support',value:JSON.stringify(s)})});}
export async function activities(admin=false){return emailRpc<Activity[]>('list_alumni_activities',{include_drafts:admin});}
export async function getActivity(id:string){return(await call<Activity[]>('activities?select=*&id=eq.'+encodeURIComponent(id)))[0]||null;}
export async function saveActivity(a:Activity){return emailRpc<boolean>('save_alumni_activity',{payload:a});}
export async function bookActivity(activityId:string,memberId:string){return emailRpc<boolean>('book_alumni_activity',{activity_value:activityId,member_value:memberId,now_value:new Date().toISOString()});}
export async function cancelBooking(id:string,memberId:string){return emailRpc<boolean>('cancel_alumni_booking',{booking_value:id,member_value:memberId});}
export async function bookings(memberId:string){return emailRpc<Booking[]>('list_alumni_bookings',{member_value:memberId});}
export async function adminBookings(){return emailRpc<Booking[]>('list_alumni_bookings',{member_value:null});}
export async function recordReview(id:string,status:string,method:string,note:string,actor:string){await emailRpc('review_alumni_member',{member_value:id,status_value:status,method_value:method,note_value:note,actor_value:actor});}
export async function reviewHistory(){return call('member_reviews?select=*&order=created.desc&limit=300');}
