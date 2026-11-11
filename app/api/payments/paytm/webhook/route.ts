import {reply} from '@/lib/payments';
import {paytmNotification} from '@/lib/paytm-notification';
export const dynamic='force-dynamic';
export async function POST(r:Request){try{await paytmNotification(r);return reply({ok:true});}catch{return reply({error:'Notification could not be verified.'},400);}}
