import {getContent} from '@/lib/community-store';
import {adminUser} from '@/lib/admin-auth';
import {ownMember,readStoredImage} from '@/lib/storage';
import {digest} from '@/lib/payments';
export const dynamic='force-dynamic';
export async function GET(r:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Not found',{status:404});const c=await getContent(id);if(!c?.image)return new Response('Not found',{status:404});if(c.status!=='published'){const token=r.headers.get('cookie')?.match(/(?:^|;\s*)anita_member=([^;]+)/)?.[1],member=token?await ownMember(await digest(token)):null;if(!await adminUser(r)&&member?.id!==c.owner_id)return new Response('Not found',{status:404});}const p=await readStoredImage(c.image);return p?new Response(p.body,{headers:{'Content-Type':p.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}):new Response('Not found',{status:404});}
