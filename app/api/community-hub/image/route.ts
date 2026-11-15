import {hubPost,publishableOwner} from '@/lib/community-hub';
import {networkIdentity} from '@/lib/network-auth';
import {readStoredImage} from '@/lib/storage';
export const dynamic='force-dynamic';
export async function GET(r:Request){try{const p=await hubPost(new URL(r.url).searchParams.get('id')||'');if(!p?.image)return new Response('Not found',{status:404});const published=p.status==='published'&&p.permission&&await publishableOwner(p);if(!published){const identity=await networkIdentity(r);if(!identity.admin&&(!identity.me||identity.me.id!==p.ownerId))return new Response('Not found',{status:404});}const image=await readStoredImage(p.image);return image?new Response(image.body,{headers:{'Content-Type':image.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}):new Response('Not found',{status:404});}catch{return new Response('Not found',{status:404});}}
