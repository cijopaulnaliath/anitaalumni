// Existing regression fixtures deliberately run against the pre-migration/email-only setup.
const fs=require('fs'),ts=require('typescript');
module.exports=function dependency(name){
 if(name==='./phone-store'||name==='@/lib/phone-store')return {phoneSchemaReady:async()=>false,phoneColumns:async()=>'',verifiedContactFilter:async()=> 'email_verified_at=not.is.null'};
 if(name==='@/lib/phone-verification')return {phoneReady:async()=>false};
 if(name==='./contact-verification'||name==='@/lib/contact-verification'){
  const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/contact-verification.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports);return m.exports;
 }
 return require(name);
};
