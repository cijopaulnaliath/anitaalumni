import { readPhoto } from '@/lib/storage';
import {digest} from '@/lib/payments';
export const dynamic='force-dynamic';
export async function GET(r:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Not found',{status:404});const token=r.headers.get('cookie')?.match(/(?:^|;\s*)anita_member=([^;]+)/)?.[1];const p=await readPhoto(id,token?await digest(token):'');return p?new Response(p.body,{headers:{'Content-Type':p.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}):new Response('Not found',{status:404});}
