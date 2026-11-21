import {ownMember,setMemberPhoto,putPhoto,deletePhoto} from '@/lib/storage';
import {digest,sameOrigin,reply} from '@/lib/payments';
import {validatePhoto} from '@/lib/profile-photo';
export const dynamic='force-dynamic';
async function owner(r:Request){const token=r.headers.get('cookie')?.match(/(?:^|;\s*)anita_member=([^;]+)/)?.[1];const hash=token?await digest(token):'';return {hash,member:hash?await ownMember(hash):null};}
export async function PUT(r:Request){
 if(!sameOrigin(r))return reply({error:'Please upload from this website.'},403);
 if(Number(r.headers.get('content-length')||0)>4*1024*1024)return reply({error:'Please choose a photo under 3 MB.'},413);
 try{
  const {hash,member}=await owner(r);
  if(!member)return reply({error:'Register your profile on this browser before uploading a photo.'},401);
  const f=await r.formData(),photo=f.get('photo');
  if(!(photo instanceof File))return reply({error:'Please choose a JPG, PNG, or WebP photo.'},400);
  const {data,type}=await validatePhoto(photo);
  // A new object path avoids an upstream storage/CDN cache serving the previous picture.
  const version=crypto.randomUUID(),key='members/'+member.id+'/'+version;
  await putPhoto(key,data,type);
  try{await setMemberPhoto(hash,key)}catch(e){
   await deletePhoto(key).catch(()=>{});
   throw e;
  }
  if(member.photo&&member.photo!==key)await deletePhoto(String(member.photo)).catch(()=>{});
  return reply({ok:true,version});
 }catch(e){return reply({error:e instanceof Error?e.message:'Unable to upload your photo. Please try again.'},400);}
}
export async function DELETE(r:Request){if(!sameOrigin(r))return reply({error:'Invalid request.'},403);try{const {hash,member}=await owner(r);if(!member)return reply({error:'No profile is linked to this browser.'},401);await setMemberPhoto(hash,null);if(member.photo)await deletePhoto(String(member.photo));return reply({ok:true});}catch{return reply({error:'Unable to remove your photo. Please try again.'},500);}}
