const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
function load(path,deps={}){const m={exports:{}},code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(n=>n in deps?deps[n]:require("./helpers/email-only-dependencies.cjs")(n),m,m.exports);return m.exports;}
(async()=>{
 const {submitRegistration}=load('lib/registration-submit.ts');const payload=new FormData();payload.set('email','member@example.invalid');let calls=[];
 global.fetch=async(url,init)=>{calls.push({url,init});return Response.json({ok:true,id:'saved',welcomeStatus:'pending'},{status:201})};
 assert.equal((await submitRegistration(payload)).id,'saved');assert.equal(calls.length,1);assert.equal(calls[0].init.body,payload);assert(!calls[0].init.headers);
 global.fetch=async(url)=>{calls.push({url});if(url==='/api/members')throw TypeError('Failed to fetch');return Response.json({member:{id:'recovered',email:'member@example.invalid'}})};
 calls=[];assert.equal((await submitRegistration(payload)).id,'recovered');assert.equal(calls.filter(c=>c.url==='/api/members').length,1);
 global.fetch=async(url)=>url==='/api/members'?Promise.reject(TypeError('Failed to fetch')):Response.json({member:{id:'other',email:'another@example.invalid'}});
 await assert.rejects(()=>submitRegistration(payload),/connection was interrupted/);
 global.fetch=async()=>{throw TypeError('Failed to fetch')};await assert.rejects(()=>submitRegistration(payload),/My account/);
 global.fetch=async(url)=>url==='/api/members'?new Response('Too large',{status:413}):Response.json({member:null});await assert.rejects(()=>submitRegistration(payload),/too large/);
 global.fetch=async()=>Response.json({error:'Already registered',code:'EMAIL_EXISTS'},{status:409});assert.equal((await submitRegistration(payload)).code,'EMAIL_EXISTS');
 const jobs=[];let saved=false,notifications=0;const route=load('app/api/members/route.ts',{
  'next/server':{after:job=>jobs.push(job)},'@/lib/directory-search':{},'@/lib/association-notifications':{notifyRegistration:async()=>{notifications++;return 'sent'}},'@/lib/welcome-email':{sendWelcome:async()=>{notifications++;return 'sent'}},
  '@/lib/storage':{emailExists:async()=>false,addMember:async()=>{saved=true;return true}},'@/lib/registration-fields':load('lib/registration-fields.ts'),'@/lib/email-store':{hasProof:async()=>true},'@/lib/email-verification':{sessionHash:async()=> 'session',emailTestMode:()=>false},'@/lib/profile-photo':{}
 });
 const form=new FormData();for(const[k,v]of Object.entries({name:'Fictional Member',email:'member@example.invalid',phone:'+919876543210',year:1988,level:'Class 10',city:'Kochi',country:'India',profession:'Engineer',enrollment:'alumni',consent:'yes',feeCommitment:'yes',emailChallengeId:'11111111-1111-4111-a111-111111111111'}))form.set(k,String(v));
 const response=await route.POST(new Request('https://test.invalid/api/members',{method:'POST',body:form}));assert.equal(response.status,201);assert(saved);assert.equal(notifications,0);assert(response.headers.get('set-cookie').includes('anita_member='));assert.equal(jobs.length,1);await jobs[0]();assert.equal(notifications,2);
 const revoked=[],canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}}),toBlob:cb=>cb(new Blob(['compact'],{type:'image/jpeg'}))};
 const oldURL=global.URL,oldImage=global.Image,oldDocument=global.document;
 global.URL={createObjectURL:()=> 'blob:fixture',revokeObjectURL:v=>revoked.push(v)};global.Image=class{naturalWidth=4000;naturalHeight=3000;async decode(){}};global.document={createElement:()=>canvas};
 try{const {prepareRegistrationPhoto}=load('lib/registration-photo.ts',{'./photo-selection':{validatePhotoSelection:async()=>{}}});const file=await prepareRegistrationPhoto(new File(['original'],'camera.jpg',{type:'image/jpeg'}));assert.equal(file.type,'image/jpeg');assert.equal(file.name,'profile-photo.jpg');assert.equal(canvas.width,1200);assert.equal(canvas.height,900);assert.equal(file.size,7);assert.deepEqual(revoked,['blob:fixture']);}finally{global.URL=oldURL;global.Image=oldImage;global.document=oldDocument}
 console.log('PASS: mobile photo preparation, valid multipart, network-error recovery without duplicate POST, unrelated-profile exclusion, readable errors, saved session and post-response email work.');
})().catch(e=>{console.error(e);process.exit(1)});
