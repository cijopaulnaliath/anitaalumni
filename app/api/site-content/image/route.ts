import {getContent} from '@/lib/community-store';
import {siteContentId} from '@/lib/site-content-store';
import {siteContentField,siteContentRecordRole} from '@/lib/site-content-fields';
import {readStoredImage} from '@/lib/storage';
export const dynamic='force-dynamic';
export async function GET(r:Request){const key=new URL(r.url).searchParams.get('key')||'',field=siteContentField(key);if(field?.kind!=='image')return new Response('Not found',{status:404});try{const row=await getContent(siteContentId(key));if(!row?.image||row.role!==siteContentRecordRole||row.title!==key)return new Response('Not found',{status:404});const photo=await readStoredImage(row.image);return photo?new Response(photo.body,{headers:{'Content-Type':photo.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}):new Response('Not found',{status:404});}catch{return new Response('Not found',{status:404});}}
