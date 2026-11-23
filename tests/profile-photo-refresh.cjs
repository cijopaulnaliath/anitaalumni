const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
function load(path,deps){const m={exports:{}},code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;new Function('require','module','exports',code)(n=>n in deps?deps[n]:require("./helpers/email-only-dependencies.cjs")(n),m,m.exports);return m.exports;}
(async()=>{
 const member={id:'example',photo:'members/example'},objects=new Map([[member.photo,'old']]);let failPointer=false;
 const route=load('app/api/members/photo/route.ts',{'@/lib/storage':{ownMember:async()=>({...member}),putPhoto:async(k,data)=>objects.set(k,data),setMemberPhoto:async(_,key)=>{if(failPointer)throw Error('Save failed');member.photo=key},deletePhoto:async k=>objects.delete(k)},'@/lib/payments':{digest:async v=>v,sameOrigin:()=>true,reply:(d,status=200)=>Response.json(d,{status})},'@/lib/profile-photo':{validatePhoto:async()=>({data:'new photo',type:'image/jpeg'})}});
 const request=()=>{const data=new FormData();data.set('photo',new File(['photo'],'portrait.jpg'));return new Request('https://test.invalid/api/members/photo',{method:'PUT',headers:{cookie:'anita_member=session'},body:data})};
 const first=await(await route.PUT(request())).json(),firstKey=member.photo;
 const second=await(await route.PUT(request())).json();
 assert(first.ok&&second.ok);assert.notEqual(first.version,second.version);assert.notEqual(firstKey,member.photo);assert(!objects.has('members/example'));assert(!objects.has(firstKey));assert(objects.has(member.photo));
 const saved=member.photo;failPointer=true;assert.equal((await route.PUT(request())).status,400);assert.equal(member.photo,saved);assert.deepEqual([...objects.keys()],[saved]);
 // Exercise delayed network and image decoding: lock both actions until the fresh preview is ready.
 const slots=[];let cursor=0,calls=0,resolveUpload,resolveImage,previewSrc,refreshes=0;
 const react={useRef:v=>{const i=cursor++;return slots[i]??={current:v}},useState:v=>{const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],x=>slots[i]=x]}};
 const oldFetch=global.fetch,oldImage=global.Image;
 global.fetch=async()=>{calls++;await new Promise(r=>resolveUpload=r);return{ok:true,json:async()=>({version:'fresh-version'})}};
 global.Image=class{set src(v){previewSrc=v}decode(){return new Promise(r=>resolveImage=r)}};
 try{
  const Component=load('components/profile-photo.tsx',{'react':react,'@/lib/photo-selection':{validatePhotoSelection:async()=>{}}}).default;
  const render=()=>{cursor=0;return Component({id:'example',hasPhoto:true,onChanged:async()=>{refreshes++}})};
  const nodes=e=>!e||typeof e!=='object'?[]:[e,...[e.props?.children].flat(Infinity).flatMap(nodes)];
  const buttons=()=>nodes(render()).filter(n=>n.type==='button');
  const task=nodes(render()).find(n=>n.type==='input').props.onChange({target:{files:[new Blob(['photo'])]}});
  await new Promise(setImmediate);assert(buttons().every(b=>b.props.disabled));await buttons()[1].props.onClick();assert.equal(calls,1);
  resolveUpload();await new Promise(setImmediate);assert(buttons().every(b=>b.props.disabled));assert.equal(refreshes,0);assert.equal(previewSrc,'/api/photo/example?v=fresh-version');
  resolveImage();await task;assert.equal(refreshes,1);assert(buttons().every(b=>!b.props.disabled));assert.equal(nodes(render()).find(n=>n.type==='img').props.src,previewSrc);
 }finally{global.fetch=oldFetch;global.Image=oldImage}
 console.log('PASS: unique replacement paths, previous object cleanup, failed-save rollback, fresh preview version and action lock through image loading.');
})().catch(e=>{console.error(e);process.exit(1)});
