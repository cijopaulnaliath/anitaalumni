'use client';
import {useEffect,useState} from 'react';
export default function OtpMethod({value,onChange}:{value:'email'|'sms';onChange:(value:'email'|'sms')=>void}){
 const[ready,setReady]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/auth/phone',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(active)setReady(d.enabled===true)}).catch(()=>{});return()=>{active=false}},[]);
 return <div><div className="eras" role="group" aria-label="Verification method"><button type="button" className={value==='email'?'selected':''} aria-pressed={value==='email'} onClick={()=>onChange('email')}>Email code</button><button type="button" className={value==='sms'?'selected':''} aria-pressed={value==='sms'} disabled={!ready} onClick={()=>onChange('sms')}>SMS code{ready?'':' (awaiting setup)'}</button></div></div>;
}
