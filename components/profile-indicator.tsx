'use client';
import {useEffect,useState} from 'react';
import './profile-indicator.css';
type HeaderMember={id:string;name:string;hasPhoto:boolean};
export default function ProfileIndicator(){
 const[member,setMember]=useState<HeaderMember|null>(null),[imageFailed,setImageFailed]=useState(false),[version,setVersion]=useState(0);
 useEffect(()=>{
  let active=true;let request=0;const controller=new AbortController();
  async function refresh(){const current=++request;try{const r=await fetch('/api/account/session',{cache:'no-store',signal:controller.signal});if(!r.ok)return;const d=await r.json() as {member:HeaderMember|null};if(active&&current===request){setMember(d.member);setImageFailed(false);setVersion(Date.now())}}catch{}}
  const visible=()=>{if(document.visibilityState==='visible')void refresh()};
  void refresh();window.addEventListener('anita-account-changed',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);const timer=window.setInterval(visible,60000);
  return()=>{active=false;controller.abort();window.clearInterval(timer);window.removeEventListener('anita-account-changed',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible)};
 },[]);
 if(!member)return null;
 const initials=member.name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>Array.from(part)[0]).join('').toUpperCase()||'A';
 return <a className="header-profile" href="/account" aria-label={'Signed in as '+member.name+'. Open my account'} title={'Signed in as '+member.name}><span className="header-profile-avatar">{member.hasPhoto&&!imageFailed?<img src={'/api/photo/'+encodeURIComponent(member.id)+'?v='+version} alt="" width="44" height="44" onError={()=>setImageFailed(true)}/>:<span aria-hidden="true">{initials}</span>}</span><span className="header-profile-status" aria-hidden="true"/></a>;
}
