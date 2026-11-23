const fs=require('node:fs'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
 const db=new PGlite();await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);");
 await db.exec(fs.readFileSync('supabase.sql','utf8'));await db.exec(fs.readFileSync('supabase/migrations/20261123_phone_otp.sql','utf8'));
 // The migration is safe to run a second time.
 await db.exec(fs.readFileSync('supabase/migrations/20261123_phone_otp.sql','utf8'));
 const q=async(sql,args=[]) =>(await db.query(sql,args)).rows;
 const rpc=async(name,args=[]) =>(await q(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args))[0].value;
 let now=1800000000000,serial=0;
 const sid='VE'+'a'.repeat(32);
 async function proof(phone,purpose='registration',session='browser',when){when=when??now+3600001;now=when;const id='challenge-'+(++serial);assert(await rpc('reserve_alumni_phone_challenge',[JSON.stringify({id,phone,purpose,session_hash:session,ip_hash:'ip-'+serial,sent_at:when})]));assert(await rpc('activate_alumni_phone_challenge',[id,sid,when]));const attempt=await q('select * from attempt_alumni_phone_challenge($1,$2,$3,$4,$5)',[id,phone,session,purpose,when]);assert.equal(attempt.length,1);assert(await rpc('mark_alumni_phone_verified',[id,sid,when]));return id}
 const payload=(id,phone,email='')=>({id,phone,email,name:'Fictional Member',year:1988,level:'Class 10',city:'Kochi',profession:'Engineer',country:'India',bio:'',interests:'[]',participation:'[]',enrollment:'alumni',visible:1,tokenHash:'token-'+id,created:'2026-11-23T00:00:00Z',verification:'approved',emailUpdates:1});
 const phone='+919900000001',id=await proof(phone);
 for(const args of [[id,phone,'other','registration',now],[id,phone,'browser','signin',now],[id,'+919900000099','browser','registration',now],[id,phone,'browser','registration',now+600000]])assert.equal(await rpc('has_alumni_phone_proof',args),false);
 assert.equal(await rpc('register_alumni_phone_member',[JSON.stringify(payload('phone-member',phone,'unverified@example.invalid')),id,'other',now]),false);
 assert(await rpc('register_alumni_phone_member',[JSON.stringify(payload('phone-member',phone,'unverified@example.invalid')),id,'browser',now]));
 let m=(await q('select * from members where id=$1',['phone-member']))[0];assert.equal(m.email_verified_at,null);assert(m.phone_verified_at);assert.equal(m.email_updates_opt_in,0);assert.equal(m.verification,'pending');assert.equal(m.is_test,0);
 assert.equal(await rpc('register_alumni_phone_member',[JSON.stringify(payload('replay',phone)),id,'browser',now]),false);
 const login=await proof(phone,'signin');assert.equal(await rpc('signin_alumni_phone_member',[phone,login,'wrong','new-token',now]),false);assert(await rpc('signin_alumni_phone_member',[phone,login,'browser','new-token',now]));assert.equal(await rpc('signin_alumni_phone_member',[phone,login,'browser','replay-token',now]),false);
 await assert.rejects(()=>q("update members set phone='+919900000002' where id='phone-member'"),/only verified contact/);
 await db.exec("insert into members(id,name,email,year,level,city,token_hash,created,phone,verification,is_test) values('legacy','Legacy','legacy@example.invalid',1988,'Class 10','Kochi','legacy-token','now','+91 99000 00003','approved',0)");
 const legacyPhone='+919900000003',legacyLogin=await proof(legacyPhone,'signin');assert.equal(await rpc('signin_alumni_phone_member',[legacyPhone,legacyLogin,'browser','attacker',now]),false);
 const duplicate=await proof(legacyPhone);await assert.rejects(()=>rpc('register_alumni_phone_member',[JSON.stringify(payload('duplicate',legacyPhone)),duplicate,'browser',now]),/PHONE_EXISTS/);
 const attach=await proof(legacyPhone,'attach');assert.equal(await rpc('attach_alumni_verified_phone',['bad-token',legacyPhone,attach,'browser',now]),false);assert(await rpc('attach_alumni_verified_phone',['legacy-token',legacyPhone,attach,'browser',now]));
 const linkedLogin=await proof(legacyPhone,'signin','browser2',now+60001);assert(await rpc('signin_alumni_phone_member',[legacyPhone,linkedLogin,'browser2','linked-token',now+60001]));
 // Existing verified email permits editing a phone, but doing so clears its SMS credential.
 await q("update members set email_verified_at='verified' where id='legacy'");await q("update members set phone='+919900000004' where id='legacy'");assert.equal((await q("select phone_verified_at from members where id='legacy'"))[0].phone_verified_at,null);
 // An optional, unverified email on a phone account must never become a login credential.
 await q("insert into email_challenges(id,email,session_hash,ip_hash,code_hash,expires_at,sent_at,is_test,verified_at) values('email-login','unverified@example.invalid','browser','ip','hash',$1,$2,0,$2)",[now+600000,now]);
 assert.equal(await rpc('signin_alumni_member',['unverified@example.invalid','email-login','browser','takeover',now]),false);
 assert.equal(await rpc('signin_alumni_google',['unverified@example.invalid','google-attacker','takeover',now]),false);
 assert.equal((await q("select token_hash from members where id='phone-member'"))[0].token_hash,'new-token');
 // Email linking consumes a separate verified email proof and never infers email ownership from SMS.
 await q("insert into email_challenges(id,email,session_hash,ip_hash,code_hash,expires_at,sent_at,is_test,verified_at) values('email-proof','unverified@example.invalid','browser','ip','hash',$1,$2,0,$2)",[now+600000,now]);
 assert.equal(await rpc('add_alumni_verified_email',['new-token','other@example.invalid','email-proof','browser',now]),false);assert(await rpc('add_alumni_verified_email',['new-token','unverified@example.invalid','email-proof','browser',now]));assert.equal(await rpc('add_alumni_verified_email',['new-token','unverified@example.invalid','email-proof','browser',now]),false);
 assert((await q("select email_verified_at from members where id='phone-member'"))[0].email_verified_at);
 assert(await rpc('signin_alumni_member',['unverified@example.invalid','email-login','browser','email-linked-token',now]));
 assert(await rpc('signin_alumni_google',['unverified@example.invalid','google-owner','google-linked-token',now]));
 // Archived and test registrations cannot acquire a live SMS session.
 const dead=await proof('+919900000007');assert(await rpc('register_alumni_phone_member',[JSON.stringify(payload('archived','+919900000007')),dead,'browser',now]));await q("update members set archived_at='removed' where id='archived'");
 const deadLogin=await proof('+919900000007','signin');assert.equal(await rpc('signin_alumni_phone_member',['+919900000007',deadLogin,'browser','bad-token',now]),false);
 await q("update members set archived_at=null,is_test=1 where id='archived'");assert.equal(await rpc('signin_alumni_phone_member',['+919900000007',deadLogin,'browser','bad-token',now]),false);
 // Correctly verified phone-only registrations may have no email at all.
 const noEmail=await proof('+919900000005');assert(await rpc('register_alumni_phone_member',[JSON.stringify(payload('no-email','+919900000005')),noEmail,'browser',now]));assert.equal((await q("select email from members where id='no-email'"))[0].email,null);
 const consumed=await proof('+919900000006');const attempts=await Promise.all([rpc('register_alumni_phone_member',[JSON.stringify(payload('single-a','+919900000006')),consumed,'browser',now]),rpc('register_alumni_phone_member',[JSON.stringify(payload('single-b','+919900000006')),consumed,'browser',now])]);assert.deepEqual(attempts.sort(),[false,true]);
 // Send/attempt limits, resend invalidation and single-use verified state.
 await q('delete from phone_challenges');const c={id:'limited',phone:'+919900000010',purpose:'registration',session_hash:'limits',ip_hash:'limit-ip',sent_at:now};assert(await rpc('reserve_alumni_phone_challenge',[JSON.stringify(c)]));assert.equal(await rpc('reserve_alumni_phone_challenge',[JSON.stringify({...c,id:'too-soon',sent_at:now+59999})]),false);assert(await rpc('activate_alumni_phone_challenge',['limited',sid,now]));
 for(let i=0;i<5;i++)assert.equal((await q('select * from attempt_alumni_phone_challenge($1,$2,$3,$4,$5)',['limited',c.phone,'limits','registration',now])).length,1);
 assert.equal((await q('select * from attempt_alumni_phone_challenge($1,$2,$3,$4,$5)',['limited',c.phone,'limits','registration',now])).length,0);
 assert(await rpc('reserve_alumni_phone_challenge',[JSON.stringify({...c,id:'resend',sent_at:now+60000})]));assert((await q("select consumed_at from phone_challenges where id='limited'"))[0].consumed_at);assert(await rpc('reserve_alumni_phone_challenge',[JSON.stringify({...c,id:'third',sent_at:now+120000})]));assert.equal(await rpc('reserve_alumni_phone_challenge',[JSON.stringify({...c,id:'fourth',sent_at:now+180000})]),false);
 // Cost controls apply across different numbers, so phone rotation cannot bypass them.
 for(const [scope,limit] of [['ip',10],['browser',5],['daily',100]]){
  await q('delete from phone_challenges');
  for(let i=0;i<=limit;i++){
   const c={id:scope+i,phone:'+91991'+String(i).padStart(7,'0'),purpose:'signin',session_hash:scope==='browser'?'same-browser':'browser-'+i,ip_hash:scope==='ip'?'same-ip':'ip-'+i,sent_at:now};
   assert.equal(await rpc('reserve_alumni_phone_challenge',[JSON.stringify(c)]),i<limit,scope+' cap');
  }
 }
 await q('delete from phone_challenges');
 const badSid={id:'wrong-sid',phone:'+919900000099',purpose:'signin',session_hash:'browser',ip_hash:'ip',sent_at:now};assert(await rpc('reserve_alumni_phone_challenge',[JSON.stringify(badSid)]));assert(await rpc('activate_alumni_phone_challenge',['wrong-sid',sid,now]));
 assert.equal(await rpc('mark_alumni_phone_verified',['wrong-sid','VE'+'b'.repeat(32),now]),false);
 await db.exec('set role anon');await assert.rejects(()=>rpc('alumni_phone_auth_version'),/permission denied/);await assert.rejects(()=>q('select * from phone_challenges'),/permission denied/);await db.exec('reset role');
 await db.close();console.log('PASS: real PostgreSQL migration/idempotency, browser/purpose/expiry binding, registration, null email, phone-only privacy, legacy account protection, linking, session rotation, replay and parallel consumption, send/attempt limits, resend invalidation, contact-change guards, email linking and anonymous permission denial.');
})().catch(e=>{console.error(e);process.exit(1)});
