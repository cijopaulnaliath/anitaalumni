import {emailReady} from './email-verification';
import {digest} from './payments';
import {audit} from './admin-store';
const contactInbox='anitavidyalaya.alumni@gmail.com';
type Notification={subject:string;text:string;html?:string;reply_to?:string};
type Status='sent'|'pending'|'unknown'|'skipped';
function site(){const url=new URL(process.env.SITE_URL||'https://anitaalumni.org');if(url.protocol!=='https:'||url.username||url.password)throw Error('Invalid site URL');return url.origin;}
export function administratorEmails(){return [...new Set((process.env.ADMIN_EMAILS||'').split(',').map(email=>email.trim().toLowerCase()).filter(email=>email.length<=254&&/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email)))].sort();}
async function record(kind:string,id:string,status:Status,count:number){await audit('system','notification.'+kind+'.'+status,id,String(count)+' recipients; sent means accepted by email provider').catch(()=>{});}
async function notify(kind:'contact'|'registration'|'batch-leader',id:string,recipients:string[],letter:Notification):Promise<Status>{
 if(!recipients.length||!emailReady()){await record(kind,id,'pending',recipients.length);return 'pending';}
 try{for(let index=0;index<recipients.length;index+=100){const group=recipients.slice(index,index+100),key=await digest(kind+'|'+id+'|'+group.join(','));const r=await fetch('https://api.resend.com/emails/batch',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'anita-notice-'+key},body:JSON.stringify(group.map(email=>({from:process.env.EMAIL_FROM,to:[email],...letter}))),signal:AbortSignal.timeout(12000)});if(!r.ok){await record(kind,id,'unknown',recipients.length);return 'unknown';}const result=await r.json() as {data?:{id?:string}[]};if(result.data?.length!==group.length||result.data.some(row=>!row.id)){await record(kind,id,'unknown',recipients.length);return 'unknown';}}
 await record(kind,id,'sent',recipients.length);return 'sent';
 }catch{await record(kind,id,'unknown',recipients.length);return 'unknown';}
}
export async function notifyContact(m:{id:string;name:string;email:string;subject:string;message:string}):Promise<Status>{try{return await notify('contact',m.id,[contactInbox],{subject:'Anita Alumni enquiry: '+m.subject.replace(/[\r\n]+/g,' ').slice(0,120),reply_to:m.email,text:['A new contact enquiry has been saved.','From: '+m.name,'Email: '+m.email,'Subject: '+m.subject,'Message:\n'+m.message,'View the private Contact inbox: '+site()+'/admin','Reference: '+m.id,'Reply to this email to respond directly to the enquirer.'].join('\n\n')});}catch{return 'unknown';}}
export async function notifyRegistration(m:{id:string;name:string;email:string;year:number;level:string;city:string;country:string;isTest:boolean}):Promise<Status>{if(m.isTest)return 'skipped';try{return await notify('registration',m.id,administratorEmails(),{subject:'New Anita Alumni registration — Batch '+m.year,text:['A new email-verified registration is awaiting school/association review.','Name: '+m.name,'Batch: '+m.year,'Last class: '+m.level,'Location: '+[m.city,m.country].filter(Boolean).join(', '),'Email: '+m.email,'Review registrations: '+site()+'/admin','Registration reference: '+m.id,'This notification does not approve the member or confirm membership payment.'].join('\n\n')});}catch{return 'unknown';}}

function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function batchLeaderLetter(name:string,year:number):Notification{
 const origin=site(),workspace=origin+'/batch-workspace';
 const paragraphs=[
  'Dear '+name+',',
  'We are pleased to confirm your appointment as Batch Leader for the Class of '+year+' at Anita Alumni. Thank you for volunteering your time and leadership to strengthen the connection between your classmates, our school, and the wider alumni community.',
  'As a Batch Leader, you can help reconnect classmates, encourage registrations, recommend school and batch connections for administrator review, and coordinate batch updates and activities.',
  'Your Batch Leader workspace is now available. Sign in using your registered email address and the verification code sent to your inbox, then open the workspace below. No separate password is required.',
  'Open your workspace: '+workspace,
  'Your role is limited to your appointed batch. School approval and administrator decisions remain with the association team. Please respect members’ privacy and use personal information only for authorized alumni activities.',
  'If you have questions or need support, reply to this email or contact '+contactInbox+'.',
  'We look forward to working with you to build an active and welcoming alumni community.',
  'With appreciation,\nAnita Alumni Team\nLove and Serve'
 ];
 return{subject:'Your Batch Leader appointment — Class of '+year+' | Anita Alumni',reply_to:contactInbox,text:paragraphs.join('\n\n'),html:'<!doctype html><html><body style="margin:0;background:#f8f7f1;color:#173f35;font:16px/1.7 Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:32px 24px"><p style="letter-spacing:2px;font-size:13px">ANITA ALUMNI · LOVE AND SERVE</p><h1 style="font:32px Georgia,serif">Your Batch Leader appointment</h1><p style="font-weight:bold">Class of '+year+'</p>'+paragraphs.map(p=>'<p>'+escapeHtml(p).replaceAll('\n','<br>')+'</p>').join('')+'<p><a href="'+workspace+'" style="display:inline-block;padding:14px 22px;background:#173f35;color:#fff;text-decoration:none;border-radius:4px">Open Batch Leader workspace</a></p></div></body></html>'};
}
export async function notifyBatchLeader(member:{id:string;name:string;email:string;year:number},appointmentId:string):Promise<Status>{
 try{
  if(!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(member.email))return 'skipped';
  return await notify('batch-leader',appointmentId,[member.email],batchLeaderLetter(member.name,member.year));
 }catch{return 'unknown';}
}
