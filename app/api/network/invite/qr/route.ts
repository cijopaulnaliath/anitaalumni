import QRCode from 'qrcode';
import {resolveInvitation} from '@/lib/network-actions';
import {siteOrigin} from '@/lib/network-auth';
export const dynamic='force-dynamic';
export async function GET(r:Request){const code=new URL(r.url).searchParams.get('code')||'';try{if(!await resolveInvitation(code))return new Response('Invitation not found',{status:404});const svg=await QRCode.toString(siteOrigin()+'/register?invite='+encodeURIComponent(code),{type:'svg',errorCorrectionLevel:'M',margin:4,width:360,color:{dark:'#173f35',light:'#ffffff'}});return new Response(svg,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'no-store','Content-Disposition':'inline; filename="anita-alumni-invitation.svg"','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"}});}catch{return new Response('Unable to create QR code',{status:503});}}
