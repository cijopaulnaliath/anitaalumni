import {reply,sameOrigin,validHmac,provider,reconcile,publicPayment} from '@/lib/payments';
import {paymentEnv} from '@/lib/payment-config';
import {getPayment} from '@/lib/payment-storage';
import type {ProviderPayment} from '@/lib/payment-types';
export const dynamic='force-dynamic';
export async function POST(r:Request){if(!sameOrigin(r))return reply({error:'Invalid request.'},403);try{const b=await r.json() as Record<string,string>;const p=await getPayment(String(b.transactionId));const secret=paymentEnv().RAZORPAY_KEY_SECRET;if(!p||!p.order_id||!secret||b.razorpay_order_id!==p.order_id||!/^pay_[a-zA-Z0-9]+$/.test(b.razorpay_payment_id)||!await validHmac(p.order_id+'|'+b.razorpay_payment_id,b.razorpay_signature,secret))return reply({error:'Payment verification failed. No membership or donor shout-out was granted.'},400);
 const pay=await provider<ProviderPayment>('payments/'+b.razorpay_payment_id);const result=await reconcile(p,pay);return reply({payment:publicPayment(result)});
 }catch{return reply({error:'We could not confirm your payment yet. Use Check payment status before trying to pay again.'},502);}}
