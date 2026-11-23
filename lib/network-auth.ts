import {contactVerified} from './contact-verification';
import {ownMember} from './storage';
import {digest} from './payments';
import {adminUser} from './admin-auth';
import {listContent} from './community-store';
import type {NetworkMember} from './network-types';
export const validId=(id:string)=>/^[a-f0-9-]{36}$/.test(id);
export function activeAlumnus(m:Partial<NetworkMember>|null):m is NetworkMember{return !!m&&!m.archived_at&&!m.is_test&&m.verification==='approved'&&contactVerified(m)&&m.enrollment==='alumni';}
export function validYear(value:unknown){const year=Number(value);if(!Number.isInteger(year)||year<1970||year>new Date().getFullYear())throw Error('Choose a valid batch year.');return year;}
export async function networkIdentity(r:Request){const token=r.headers.get('cookie')?.match(/(?:^|;\s*)anita_member=([^;]+)/)?.[1],me=token?await ownMember(await digest(token)) as unknown as NetworkMember|null:null,admin=await adminUser(r);const leader=activeAlumnus(me)?(await listContent('leader',true)).find(c=>c.owner_id===me.id&&c.status==='published'&&c.year===me.year&&c.title===me.name):null;return{me,admin,leader};}
export function requireMember(me:NetworkMember|null){if(!activeAlumnus(me))throw Error('Sign in with an approved, contact-verified alumni profile to use this feature.');return me;}
export function workspaceYear(identity:Awaited<ReturnType<typeof networkIdentity>>,value:unknown){if(identity.admin)return validYear(value||identity.me?.year||new Date().getFullYear());if(!identity.leader||!activeAlumnus(identity.me))throw Error('An active batch leader appointment is required.');return identity.me.year;}
export function siteOrigin(){const url=new URL(process.env.SITE_URL||'https://anitaalumni.org');if(url.protocol!=='https:'||url.username||url.password)throw Error('Invalid website address.');return url.origin;}
