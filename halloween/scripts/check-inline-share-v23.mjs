import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');const start=source.indexOf('async function shareAll()'),end=source.indexOf('\nasync function imagePNG',start);const fn=source.slice(start,end);
const image={type:'image/png',name:'reference.png'},promptFile={type:'text/plain',name:'prompt.txt'},status={textContent:''};let payload;
const ctx={currentResult:{isFresh:true,prompt:'ALL TEN FULL CONDITIONS',collection:'everyday'},shareFiles:()=>[image,promptFile],canShareFiles:()=>true,navigator:{share:async p=>payload=p},$:()=>status,downloadKit(){throw Error('Unnecessary ZIP download');},tell(){}};
vm.createContext(ctx);vm.runInContext(fn+';shareAll()',ctx);await new Promise(r=>setImmediate(r));
assert.equal(payload.text,ctx.currentResult.prompt);assert.equal(payload.files.length,1);assert.equal(payload.files[0],image);assert.ok(!payload.files.includes(promptFile));assert.match(status.textContent,/参照画像を共有/);
console.log('PASS native share sends references with the full prompt inline first, avoiding a separate prompt.txt read; ZIP export remains an explicit fallback.');
