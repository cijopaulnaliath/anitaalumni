import {reply} from '@/lib/payments';
import {paytmNotification} from '@/lib/paytm-notification';
export const dynamic='force-dynamic';
export async function POST(r:Request){try{await paytmNotification(r);return Response.redirect(new URL('/donate?payment_return=paytm',process.env.SITE_URL),303);}catch{return reply({error:'Payment confirmation is pending. Return to Membership & giving and check payment status before paying again.'},502);}}
