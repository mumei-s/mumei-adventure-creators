import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {normalizeImageFile} from '../image-files.js';

const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const share=source.slice(source.indexOf('async function shareAll()'),source.indexOf('async function imagePNG'));
const image=new File(['image bytes'],'Screenshot_20261007.PNG',{type:'image/png'});
const prompt=new File(['full prompt'],'prompt.txt',{type:'text/plain'});
function environment(support,error){
 const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:true,dataset:{},scrollIntoView(){}});return nodes.get(id);};
 const calls=[];const context={currentResult:{isFresh:true,prompt:'TEN CONDITIONS + WHOLE RECIPES',collection:'halloween'},shareFiles:()=>[image,prompt],canShareFiles:()=>support,navigator:{share:async data=>{calls.push(data);if(error)throw error;}},$:get};
 vm.createContext(context);vm.runInContext(share,context);
 return {context,calls,get};
}
{
 const t=environment(true);await t.context.shareAll();assert.deepEqual([...t.calls[0].files],[image]);assert.equal(t.calls[0].text,t.context.currentResult.prompt);assert.equal(t.get('transfer-fallback').hidden,true);
}
{
 const t=environment(false);await t.context.shareAll();assert.equal(t.calls.length,0);assert.equal(t.get('transfer-fallback').hidden,false);assert.equal(t.get('result-refs').dataset.manual,'true');await t.context.shareText();assert.equal(t.calls[0].text,t.context.currentResult.prompt);assert.equal(t.calls[0].files,undefined);
}
{
 const t=environment(true,new TypeError('WebView rejects file sharing'));await t.context.shareAll();assert.equal(t.calls.length,1);assert.equal(t.get('transfer-fallback').hidden,false);
 const aborted=environment(true,Object.assign(new Error('cancel'),{name:'AbortError'}));await aborted.context.shareAll();assert.equal(aborted.get('transfer-fallback').hidden,true);assert.match(aborted.get('transfer-status').textContent,/取り消し/);
}
const screenshot=new File(['bytes'],'Screenshot_20261007.PNG',{lastModified:123});
const normalized=normalizeImageFile(screenshot);assert.equal(normalized.type,'image/png');assert.equal(normalized.lastModified,123);assert.equal(await normalized.text(),'bytes');assert.equal(normalizeImageFile(new File(['x'],'notes.txt')),null);
console.log('PASS native image+full-text sharing, unsupported/rejected/cancelled file shares, explicit text retry, and screenshots without MIME; no automatic ZIP or downloads.');
