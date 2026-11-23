type RegistrationResult={ok?:boolean;id?:string;welcomeStatus?:string;error?:string;code?:string};
const connectionMessage='The connection was interrupted while saving your registration. Your details are still here. Check My account to see whether it was saved before trying again. On a weak connection, try without a photo and add it later in My account.';
async function recoverRegistration(email:string):Promise<RegistrationResult|null>{
 try{const r=await fetch('/api/members?me',{cache:'no-store',credentials:'same-origin'});if(!r.ok)return null;const d=await r.json();if(d.member?.id&&String(d.member.email||'').toLowerCase()===email)return {ok:true,id:d.member.id,welcomeStatus:'pending'};}catch{}
 return null;
}
export async function submitRegistration(payload:FormData):Promise<RegistrationResult>{
 const email=String(payload.get('email')||'').trim().toLowerCase();
 let r:Response;
 try{r=await fetch('/api/members',{method:'POST',body:payload,credentials:'same-origin'});}catch{
  const saved=await recoverRegistration(email);if(saved)return saved;
  throw Error(connectionMessage);
 }
 let result:RegistrationResult;
 try{result=await r.json();}catch{
  const saved=await recoverRegistration(email);if(saved)return saved;
  if(r.status===413)throw Error('The photo upload is too large. Choose a smaller JPG, PNG, or WebP photo, or continue without a photo and add it later.');
  throw Error(connectionMessage);
 }
 if(!r.ok)return {...result,ok:false,error:result.error||'Your registration could not be saved. Please try again.'};
 if(result.ok!==true){const saved=await recoverRegistration(email);if(saved)return saved;throw Error(connectionMessage)}
 return result;
}
