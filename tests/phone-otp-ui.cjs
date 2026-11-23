const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
// Execute the real client components with a deterministic hook scheduler. No live messages.
function component(path,initialProps){
 let slots=[],cursor=0,effects=[],dirty=false,tree,props=initialProps;
 const hooks={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true}}]},useRef(initial){const i=cursor++;return slots[i]||(slots[i]={current:initial})},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>!Object.is(d,old.deps[j])))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})}};
 const m={exports:{}},code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',code)(name=>name==='react'?hooks:name==='@/lib/registration-fields'?{normalizePhone:p=>/^\+[1-9]\d{7,14}$/.test(p)?p:null}:require(name),m,m.exports);
 function render(){for(let count=0;count<15;count++){cursor=0;dirty=false;effects=[];tree=m.exports.default(props);for(const fn of effects)fn();if(!dirty)return tree}throw Error('Render loop')}
 return{render,update(next){props={...props,...next};return render()},unmount(){for(const s of slots)s?.cleanup?.()}};
}
function nodes(tree,predicate){const result=[];function walk(n){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(walk);return}if(predicate(n))result.push(n);walk(n.props?.children)}walk(tree);return result}
const text=n=>!n?'':typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):text(n.props?.children);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 let ready=false,posts=0,pendingResolve;
 global.fetch=async(url,init)=>!init?.method?Response.json({enabled:ready}):(posts++,new Promise(resolve=>{pendingResolve=resolve}));
 let selected='';const method=component('components/otp-method.tsx',{value:'email',onChange:v=>{selected=v}});method.render();await tick();let tree=method.render();let sms=nodes(tree,n=>n.type==='button'&&text(n).startsWith('SMS'))[0];assert.equal(sms.props.disabled,true);assert.match(text(sms),/awaiting setup/);method.unmount();
 ready=true;const available=component('components/otp-method.tsx',{value:'email',onChange:v=>{selected=v}});available.render();await tick();sms=nodes(available.render(),n=>n.type==='button'&&text(n).startsWith('SMS'))[0];assert.equal(sms.props.disabled,false);sms.props.onClick();assert.equal(selected,'sms');available.unmount();
 let proofs=[],resets=0;const phone=component('components/phone-verification.tsx',{phone:'+919876543210',purpose:'registration',onVerified:id=>proofs.push(id),onReset:()=>{resets++}});phone.render();await tick();tree=phone.render();let send=nodes(tree,n=>n.type==='button')[0];assert(send.props.disabled);nodes(tree,n=>n.type==='input'&&n.props.type==='checkbox')[0].props.onChange({target:{checked:true}});send=nodes(phone.render(),n=>n.type==='button')[0];assert.equal(send.props.disabled,false);
 const first=send.props.onClick();send.props.onClick();assert.equal(posts,1);tree=phone.render();assert(nodes(tree,n=>n.type==='button')[0].props.disabled);assert.equal(resets,1);
 // A response for an old number must not restore its challenge or enable Continue.
 phone.update({phone:'+919876543211'});pendingResolve(Response.json({ok:true,challengeId:'stale',resendAfter:60}));await first;tree=phone.render();assert.equal(proofs.length,0);assert.equal(nodes(tree,n=>n.type==='input'&&n.props.autoComplete==='one-time-code').length,0);
 nodes(tree,n=>n.type==='input'&&n.props.type==='checkbox')[0].props.onChange({target:{checked:true}});send=nodes(phone.render(),n=>n.type==='button')[0];const sending=send.props.onClick();pendingResolve(Response.json({ok:true,challengeId:'fresh',resendAfter:60}));await sending;tree=phone.render();assert.match(text(tree),/expires in 10 minutes/);assert.match(text(nodes(tree,n=>n.type==='button')[0]),/Resend in 60s/);
 const code=nodes(tree,n=>n.type==='input'&&n.props.autoComplete==='one-time-code')[0];assert.equal(code.props.inputMode,'numeric');assert.equal(code.props.maxLength,6);code.props.onChange({target:{value:'12a3456'}});tree=phone.render();const verify=nodes(tree,n=>n.type==='button'&&text(n)==='Verify code')[0];assert.equal(verify.props.disabled,false);
 const verifying=verify.props.onClick();pendingResolve(Response.json({ok:true,challengeId:'fresh'}));await verifying;tree=phone.render();assert.deepEqual(proofs,['fresh']);assert.match(text(tree),/Phone verified/);phone.unmount();
 // Email has the same stale-response and double-send protection.
 posts=0;const email=component('components/email-verification.tsx',{email:'first@example.invalid',onVerified:id=>proofs.push(id)});email.render();await tick();let emailSend=nodes(email.render(),n=>n.type==='button')[0];assert.equal(emailSend.props.disabled,false);const emailSending=emailSend.props.onClick();emailSend.props.onClick();assert.equal(posts,1);email.update({email:'second@example.invalid'});pendingResolve(Response.json({ok:true,challengeId:'stale-email'}));await emailSending;assert.equal(nodes(email.render(),n=>n.type==='input'&&n.props.autoComplete==='one-time-code').length,0);email.unmount();
 console.log('PASS: actual email/SMS components, disabled setup/consent/busy controls, channel selection, duplicate-send suppression, resend countdown, six-digit mobile input, successful verification, and ignored responses after contact changes.');
})().catch(e=>{console.error(e);process.exit(1)});
