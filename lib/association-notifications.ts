import {emailReady} from './email-verification';
import {digest} from './payments';
import {audit} from './admin-store';
const contactInbox='anitavidyalaya.alumni@gmail.com';
type Notification={subject:string;text:string;reply_to?:string};
type Status='sent'|'pending'|'unknown'|'skipped';
function site(){const url=new URL(process.env.SITE_URL||'https://anitaalumni.org');if(url.protocol!=='https:'||url.username||url.password)throw Error('Invalid site URL');return url.origin;}
export function administratorEmails(){return [...new Set((process.env.ADMIN_EMAILS||'').split(',').map(email=>email.trim().toLowerCase()).filter(email=>email.length<=254&&/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email)))].sort();}
async function record(kind:string,id:string,status:Status,count:number){await audit('system','notification.'+kind+'.'+status,id,String(count)+' recipients; sent means accepted by email provider').catch(()=>{});}
async function notify(kind:'contact'|'registration',id:string,recipients:string[],letter:Notification):Promise<Status>{
 if(!recipients.length||!emailReady()){await record(kind,id,'pending',recipients.length);return 'pending';}
 try{for(let index=0;index<recipients.length;index+=100){const group=recipients.slice(index,index+100),key=await digest(kind+'|'+id+'|'+group.join(','));const r=await fetch('https://api.resend.com/emails/batch',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'anita-notice-'+key},body:JSON.stringify(group.map(email=>({from:process.env.EMAIL_FROM,to:[email],...letter}))),signal:AbortSignal.timeout(12000)});if(!r.ok){await record(kind,id,'unknown',recipients.length);return 'unknown';}const result=await r.json() as {data?:{id?:string}[]};if(result.data?.length!==group.length||result.data.some(row=>!row.id)){await record(kind,id,'unknown',recipients.length);return 'unknown';}}
 await record(kind,id,'sent',recipients.length);return 'sent';
 }catch{await record(kind,id,'unknown',recipients.length);return 'unknown';}
}
export async function notifyContact(m:{id:string;name:string;email:string;subject:string;message:string}):Promise<Status>{try{return await notify('contact',m.id,[contactInbox],{subject:'Anita Alumni enquiry: '+m.subject.replace(/[\r\n]+/g,' ').slice(0,120),reply_to:m.email,text:['A new contact enquiry has been saved.','From: '+m.name,'Email: '+m.email,'Subject: '+m.subject,'Message:\n'+m.message,'View the private Contact inbox: '+site()+'/admin','Reference: '+m.id,'Reply to this email to respond directly to the enquirer.'].join('\n\n')});}catch{return 'unknown';}}
export async function notifyRegistration(m:{id:string;name:string;email:string;year:number;level:string;city:string;country:string;isTest:boolean}):Promise<Status>{if(m.isTest)return 'skipped';try{return await notify('registration',m.id,administratorEmails(),{subject:'New Anita Alumni registration — Batch '+m.year,text:['A new email-verified registration is awaiting school/association review.','Name: '+m.name,'Batch: '+m.year,'Last class: '+m.level,'Location: '+[m.city,m.country].filter(Boolean).join(', '),'Email: '+m.email,'Review registrations: '+site()+'/admin','Registration reference: '+m.id,'This notification does not approve the member or confirm membership payment.'].join('\n\n')});}catch{return 'unknown';}}
