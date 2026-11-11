import {paymentReadiness} from '@/lib/payment-readiness';
import {settings,requestMember,digest,reply} from '@/lib/payments';
import {donorWall,getMembership} from '@/lib/payment-storage';
export const dynamic='force-dynamic';
export async function GET(r:Request){try{const s=settings(),m=await requestMember(r);const membership=m?await getMembership(s.mode+':'+await digest(m.email.toLowerCase())):null;return reply({enabled:await paymentReadiness(),mode:s.mode,currency:s.currency,membershipFee:s.fee,membershipStatus:membership?.status||'unpaid',registered:!!m&&m.enrollment!=='event'&&m.verification==='approved'&&!!m.email_verified_at,eventOnly:m?.enrollment==='event',awaitingApproval:!!m&&m.enrollment!=='event'&&(m.verification!=='approved'||!m.email_verified_at),donations:await donorWall()});}catch{return reply({error:'Giving information is temporarily unavailable.'},503);}}
