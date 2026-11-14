'use client';
import {createContext,useCallback,useContext,useEffect,useState,Fragment,type ReactNode} from 'react';
type Value={text?:string;image?:string};
type Copy={values:Record<string,Value>;refresh:()=>Promise<void>};
const Context=createContext<Copy>({values:{},refresh:async()=>{}});
export function SiteContentProvider({children}:{children:ReactNode}){const[values,setValues]=useState<Record<string,Value>>({});const refresh=useCallback(async()=>{const r=await fetch('/api/site-content',{cache:'no-store'});if(!r.ok)throw Error('Site content is temporarily unavailable.');const d=await r.json() as {values:Record<string,Value>};setValues(d.values||{});},[]);useEffect(()=>{refresh().catch(()=>{});},[refresh]);return <Context.Provider value={{values,refresh}}>{children}</Context.Provider>}
export function SiteText({id,children}:{id:string;children:ReactNode}){const{values}=useContext(Context),text=values[id]?.text;return text?text.split('\n').map((line,i)=><Fragment key={i}>{i>0&&<br/>}{line}</Fragment>):children;}
export function useSiteImage(){const{values}=useContext(Context);return Object.assign((key:string,fallback:string)=>values[key]?.image||fallback,{text:(key:string,fallback:string)=>values[key]?.text||fallback});}
export function useRefreshSiteContent(){return useContext(Context).refresh;}
