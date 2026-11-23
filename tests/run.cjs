const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const files=fs.readdirSync('tests').filter(file=>file.endsWith('.cjs')&&file!=='run.cjs').sort();
for(const file of files){const result=spawnSync(process.execPath,['tests/'+file],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1)}
console.log(`PASS: all ${files.length} test suites.`);
