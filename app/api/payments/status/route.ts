import {reply,sameOrigin,refreshPayment,publicPayment} from '@/lib/payments';
import {getPayment} from '@/lib/payment-storage';
export const dynamic='force-dynamic';
export async function POST(r:Request){if(!sameOrigin(r))return reply({error:'Invalid request.'},403);try{const b=await r.json() as {transactionId:string};if(!/^[a-f0-9-]{36}$/.test(b.transactionId))return reply({error:'Invalid payment reference.'},400);const p=await getPayment(b.transactionId);if(!p)return reply({error:'Payment reference not found.'},404);return reply({payment:publicPayment(await refreshPayment(p))});}catch{return reply({error:'Payment status is temporarily unavailable. Please check again before making another payment.'},502);}}
