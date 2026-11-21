import {getRecord} from '@/lib/network-store';
import {donorEligible,type FeaturedDonor} from '@/lib/donors';
import {adminUser} from '@/lib/admin-auth';
import {readStoredImage} from '@/lib/storage';
export const dynamic='force-dynamic';
export async function GET(r:Request){const id=new URL(r.url).searchParams.get('id')||'';if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Not found',{status:404});try{const d=await getRecord<FeaturedDonor>('donors.feature.'+id);if(!d?.image||!await donorEligible(d)&&!await adminUser(r))return new Response('Not found',{status:404});const image=await readStoredImage(d.image);return image?new Response(image.body,{headers:{'Content-Type':image.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}):new Response('Not found',{status:404});}catch{return new Response('Not found',{status:404});}}
