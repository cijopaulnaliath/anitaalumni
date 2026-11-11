import {initiatePaytm} from '@/lib/paytm';
import {paymentReadiness} from '@/lib/payment-readiness';
import {settings,requestMember,digest,sameOrigin,reply,provider,publicPayment,refreshPayment} from '@/lib/payments';
import * as store from '@/lib/payment-storage';
import type {Payment} from '@/lib/payment-types';
export const dynamic='force-dynamic';
export async function POST(r:Request){if(!sameOrigin(r))return reply({error:'Please use checkout from this website.'},403);if(Number(r.headers.get('content-length')||0)>4096)return reply({error:'Request too large.'},413);const s=settings();if(!s.enabled)return reply({error:'Payments are not open yet. Please check back after the association activates checkout.'},503);
 let claimed='';try{if(!await paymentReadiness())return reply({error:'Live checkout is waiting for the association’s approved contact, response timeframe, and refund policy.'},503);const b=await r.json() as Record<string,unknown>;if(b.purpose!=='membership'&&b.purpose!=='donation')return reply({error:'Choose membership or donation.'},400);if(b.consent!==true)return reply({error:'Please confirm the payment terms.'},400);if(!/^[a-f0-9-]{36}$/.test(String(b.requestId)))return reply({error:'Please reopen the payment form.'},400);
 const member=await requestMember(r);if(b.purpose==='membership'&&(!member||member.enrollment==='event'||member.verification!=='approved'||!member.email_verified_at))return reply({error:'Your alumni registration must be approved before you can pay the membership fee.'},401);if(b.purpose==='membership'&&!s.fee)return reply({error:'The membership fee has not been announced yet.'},503);
 const name=b.purpose==='membership'?member!.name:String(b.name||'').trim(),email=b.purpose==='membership'?member!.email:String(b.email||'').trim().toLowerCase();if(name.length<2||name.length>100||email.length>150||!/^\S+@\S+\.\S+$/.test(email))return reply({error:'Enter a valid name and email address.'},400);
 const amount=b.purpose==='membership'?s.fee!:Math.round(Number(b.amount)*100);if(!Number.isSafeInteger(amount)||amount<100||amount>10000000)return reply({error:'Choose a donation between ₹1 and ₹1,00,000.'},400);
 const key=b.purpose==='membership'?s.mode+':'+await digest(email):null;
 let p=await store.reservePayment({id:String(b.requestId),purpose:b.purpose,membership_key:key,member_id:member?.id||null,name,email,amount,currency:'INR',mode:s.mode as 'live'|'test',named:b.named===true?1:0,show_amount:b.showAmount===true?1:0,status:'pending',order_id:null,payment_id:null,lease_until:null,created:new Date().toISOString(),paid_at:null});
 if(!p||p.purpose!==b.purpose||p.mode!==s.mode||p.email!==email)return reply({error:'Please reopen checkout to start a new payment.'},409);
 if(p.order_id)p=await refreshPayment(p);
 if(p.status==='paid')return reply({alreadyPaid:true,payment:publicPayment(p)});
 if(p.status==='refunded')return reply({error:'This payment was refunded. Please contact the association before making another membership payment.'},409);
 if(s.provider==='paytm'){
 if(p.order_id&&!p.order_id.startsWith('ANITA_'))return reply({error:'An existing payment uses another provider. Contact the association before paying again.'},409);
 if(!p.order_id){if(!await store.claimOrder(p.id))return reply({error:'Checkout is being prepared. Please wait and retry.'},409);claimed=p.id;await store.attachOrder(p.id,'ANITA_'+p.id.replaceAll('-',''));claimed='';p=(await store.getPayment(p.id))!;}
 return reply(await initiatePaytm(p));
 }
 if(!p.order_id){if(!await store.claimOrder(p.id))return reply({error:'Checkout is already being prepared. Please wait a moment and try again.'},409);claimed=p.id;const order=await provider<{id:string;amount:number;currency:string}>('orders',{amount:p.amount,currency:p.currency,receipt:p.id,notes:{purpose:p.purpose,transaction_id:p.id}});if(order.amount!==p.amount||order.currency!==p.currency||!/^order_[a-zA-Z0-9]+$/.test(order.id))throw Error('Unable to prepare checkout. Please try again.');await store.attachOrder(p.id,order.id);claimed='';p=(await store.getPayment(p.id))!;}
 return reply({key:s.key,mode:s.mode,orderId:p.order_id,amount:p.amount,currency:p.currency,transactionId:p.id,prefill:{name:p.name,email:p.email},purpose:p.purpose});
 }catch{if(claimed)await store.releaseOrder(claimed).catch(()=>{});return reply({error:'Unable to prepare checkout. Please try again.'},502);}}
