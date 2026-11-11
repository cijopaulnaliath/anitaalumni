import {paymentEnv} from './payment-config';
import {digest} from './payments';
export function emailReady(){const e=paymentEnv();return !!(e.RESEND_API_KEY&&e.EMAIL_FROM&&e.EMAIL_OTP_SECRET&&e.EMAIL_OTP_SECRET.length>=32);}
export function sessionToken(r:Request){return r.headers.get('cookie')?.match(/(?:^|;\s*)anita_verify_session=([^;]+)/)?.[1]||'';}
export async function sessionHash(r:Request){const token=sessionToken(r);return token?digest(token):'';}
export async function codeHash(id:string,email:string,session:string,code:string){const secret=paymentEnv().EMAIL_OTP_SECRET;if(!secret)throw Error('Email verification is not configured.');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(id+'|'+email+'|'+session+'|'+code)));return Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function randomCode(){const values=new Uint32Array(1);do{crypto.getRandomValues(values)}while(values[0]>=4294000000);return String(values[0]%1000000).padStart(6,'0');}
export async function sendCode(email:string,code:string,id:string){const e=paymentEnv();const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+e.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'alumni-verify-'+id},body:JSON.stringify({from:e.EMAIL_FROM,to:[email],subject:'Your Anita Alumni verification code',text:`Your Anita Alumni email verification code is ${code}.\n\nIt expires in 10 minutes and can be used only in the browser that requested it. Do not share this code.\n\nIf you did not request this, ignore this email. No membership is granted by email verification alone.`})});if(!r.ok)throw Error('The verification email could not be sent. Please try again later.');}

export function emailTestMode(){return paymentEnv().EMAIL_TEST_MODE==='true'&&!emailReady();}
export function testAddress(email:string){return /^[^@\s]+@example\.test$/.test(email);}
