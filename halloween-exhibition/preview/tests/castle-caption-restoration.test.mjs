import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
test('castle bottom captions use original pre-profile typography, width and spacing',async()=>{
 for(const name of ['presentation-profiles.css','compact-gallery-header.css'])assert.doesNotMatch(await read(name),/palace-caption-stack|palace-gate-invitation|palace-gate-hint|palace-scene-note/);
 const original=await read('palace-entrance.css');
 for(const rule of ['width:min(62%,330px)','gap:3px;pointer-events:none','bottom:8px;left:50%','.palace-caption-stack>.palace-gate-invitation{font-size:clamp(12px,1.5vw,19px)}','.palace-caption-stack>.palace-gate-hint,.palace-caption-stack>.palace-scene-note{font-size:clamp(9px,1vw,11px)}','margin:0;padding:3px 7px;letter-spacing:.02em;border-radius:12px;line-height:1.25','@media(max-height:480px) and (orientation:landscape){.palace-caption-stack{width:min(36%,300px);gap:1px;bottom:4px}'])assert.ok(original.includes(rule),rule);
});
