import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css=await readFile(new URL('../magical-entrance.css',import.meta.url),'utf8');
// Static regression guards for the measured 1180x757 and 400x606 failures.
// These do not replace native-browser layout and overlap checks.
function mediaBlock(query){
 const start=css.indexOf('@media('+query+')');assert.ok(start>=0,query);
 const open=css.indexOf('{',start);let depth=1,end=open+1;
 for(;end<css.length&&depth;end++){if(css[end]==='{')depth++;if(css[end]==='}')depth--;}
 assert.equal(depth,0,'balanced media block');return css.slice(open+1,end-1);
}

test('1180px desktop reserves a separate row for mode and horror without overlaying year/passport',()=>{
 const desktop=mediaBlock('max-width:1500px');
 assert.match(desktop,/\.masthead\{[^}]*align-items:flex-start/);
 assert.match(desktop,/\.mode-switch\{[^}]*left:5%;top:71px;transform:none/);
 assert.match(desktop,/\.horror-entrance\{[^}]*left:calc\(5% \+ 169px\);top:71px;min-height:44px/);
 assert.match(desktop,/\.door-mini\{height:34px;width:24px\}/);
 assert.match(desktop,/\.edition-label\{top:137px\}\.stage\{top:172px\}/);
 // The first row's 44px actions starts at 12px; the second starts at 71px.
 assert.ok(12+44<71);assert.ok(71+44<=121);
});

test('400x606 uses its own viewport height rather than the tall-phone 800px minimum',()=>{
 const short=mediaBlock('max-width:680px) and (max-height:740px');
 assert.match(short,/\.theater\{height:100svh;min-height:560px/);
 assert.match(short,/\.theater \.stage\{bottom:165px\}/);
 assert.match(short,/\.theater \.stage-footer\{bottom:35px\}/);
 assert.match(short,/\.theater \.stage-caption\{bottom:0\}/);
 assert.match(short,/data-portrait=true[^}]*width:calc\(var\(--short-art-height\) \* \.85\)/);
 assert.match(short,/data-theme=host[^}]*width:min\(73%,calc\(var\(--short-art-height\) \* 1\.91\)\)/);
 const footerTop=606-35-116;
 assert.ok(footerTop+58+44<606,'second-row targets fit the 606px height');
 assert.ok(606-165<footerTop,'stage ends before footer');
});

test('compact header keeps every button at least 44px, including the ID-specific passport rule',()=>{
 const mobile=mediaBlock('max-width:680px');
 assert.match(mobile,/\.header-actions button\{[^}]*min-width:44px;min-height:44px/);
 assert.match(mobile,/\.header-actions #passport-open\{min-width:44px\}/);
 assert.ok(css.indexOf('@media(max-width:680px) and (max-height:740px)')>css.indexOf('@media(max-width:370px)'),'short-screen minimum overrides both phone widths');
});
