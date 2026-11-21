'use client';
import {useRef,useState} from 'react';
import {Camera,LoaderCircle,Trash2,Upload} from 'lucide-react';
import {validatePhotoSelection} from '@/lib/photo-selection';
export default function ProfilePhoto({id,hasPhoto,onChanged}:{id:string;hasPhoto:boolean;onChanged:()=>Promise<void>}){
 const input=useRef<HTMLInputElement>(null);
 const pending=useRef(false);
 const[operation,setOperation]=useState<'upload'|'remove'|null>(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[version,setVersion]=useState('0');
 const busy=operation!==null;
 async function change(file?:File){
  if(!file||pending.current)return;
  pending.current=true;setOperation('upload');setError('');setMessage('');
  try{
   await validatePhotoSelection(file);
   const data=new FormData();data.set('photo',file);
   const r=await fetch('/api/members/photo',{method:'PUT',body:data});
   const result=await r.json() as {error?:string;version?:string};
   if(!r.ok)throw Error(result.error||'Unable to upload your photo.');
   const nextVersion=result.version||String(Date.now());
   // Keep both actions locked until the saved image is downloaded and displayable.
   const savedPhoto=new Image();savedPhoto.src='/api/photo/'+id+'?v='+nextVersion;
   try{await savedPhoto.decode()}catch{throw Error('Your photo was saved, but the preview could not be loaded. Please refresh or try replacing it again.')}
   setVersion(nextVersion);
   await onChanged();
   setMessage('Your profile photo has been saved.');
  }catch(e){setError((e as Error).message||'Unable to upload your photo.')}
  finally{pending.current=false;setOperation(null);if(input.current)input.current.value=''}
 }
 async function remove(){
  if(pending.current)return;
  pending.current=true;setOperation('remove');setError('');setMessage('');
  try{const r=await fetch('/api/members/photo',{method:'DELETE'});const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||'Unable to remove your photo.');await onChanged();setMessage('Your profile photo has been removed.')}
  catch(e){setError((e as Error).message||'Unable to remove your photo.')}
  finally{pending.current=false;setOperation(null)}
 }
 return <div className="profile-photo-manager" aria-busy={busy}><div className="profile-photo-controls"><div className="profile-avatar">{hasPhoto?<img src={'/api/photo/'+id+'?v='+version} alt="Your current profile photo" onError={()=>setError('Your saved profile photo cannot be displayed. Replace it with a compatible JPG, PNG, or WebP photo.')}/>:<Camera size={30}/>}</div><div><h3>Your profile photo</h3><p>Use a clear portrait. JPG, PNG, or WebP · Up to 3 MB</p><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} aria-label="Choose your profile photo" onChange={e=>change(e.target.files?.[0])}/><div className="profile-photo-actions"><button className="btn small" type="button" disabled={busy} onClick={()=>{if(!pending.current)input.current?.click()}}>{operation==='upload'?<LoaderCircle size={14}/>:<Upload size={14}/ >}{operation==='upload'?'Uploading…':hasPhoto?'Replace photo':'Upload photo'}</button>{hasPhoto&&<button type="button" className="link-button" disabled={busy} onClick={remove}><Trash2 size={14}/>{operation==='remove'?'Removing…':'Remove'}</button>}</div>{busy&&<p role="status" aria-live="polite">{operation==='upload'?'Uploading your photo. Please wait until the new picture is ready.':'Removing your photo. Please wait.'}</p>}</div></div>{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="photo-saved" role="status">{message}</p>}</div>
}
