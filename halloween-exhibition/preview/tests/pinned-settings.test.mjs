import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
const html=await read('index.html'),css=await read('compact-gallery-header.css');
function paths(){const stack=[],found={};for(const m of html.matchAll(/<\/?([a-z][\w-]*)\b([^>]*)>/gi)){const [tag,name,attrs]=m;if(tag.startsWith('</')){stack.pop();continue;}const id=attrs.match(/\bid="([^"]+)"/)?.[1],classes=attrs.match(/\bclass="([^"]+)"/)?.[1]||'';if(id)found[id]=stack.map(x=>x.classes);if(!/^(meta|link|img|input|br|hr|source)$/i.test(name))stack.push({name,classes});}return found;}
test('all four primary buttons share one real scroll wrapper under the single settings parent',async()=>{
 const p=paths();for(const id of ['mode-halloween','mode-normal','year-open','list-open']){assert.ok(p[id].includes('toolbar-primary'),id);assert.ok(p[id].includes('header-actions'),id);}
 assert.equal((html.match(/class="header-actions"/g)||[]).length,1);
 assert.equal((html.match(/class="toolbar-primary"/g)||[]).length,1);
 const app=await read('theater.js');assert.ok(app.includes("triggerParent:document.querySelector('.header-actions')"));
 const settings=await read('visitor-preferences.js');assert.ok(settings.includes('(triggerParent || document.body).append(trigger)'));
 assert.ok(css.includes('.header-actions{display:contents}'));assert.ok(css.includes('.toolbar-primary{grid-column:1;grid-row:1;display:flex'));
 assert.ok(css.includes('.visitor-settings-trigger{grid-column:2;grid-row:1;width:44px'));
});
test('measured live label widths fit320 and settings retain a fixed right column under overflow',()=>{
 // Live DOM Range widths at16px: Halloween79.640625, Japanese list80.015625.
 // Scaling to14px is an estimate, not a phone render; all borders/padding included.
 const halloween=79.640625*14/16+4,normal=44,modeBorder=2,year=44,list=80.015625*14/16+4+2;
 const primary=halloween+normal+modeBorder+year+list+2*2;
 for(const width of [320,360,390,430]){const content=width-16,slot=content-44-4;assert.ok(primary<=slot,`${width}: ${primary} <= ${slot}`);}
 for(const width of [294,320,390])for(const textScale of [1,2,3]){const content=width-16,slot=content-48;assert.equal(slot+4+44,content);assert.ok(primary*textScale>0);}
 assert.ok(css.includes('grid-template-columns:minmax(0,1fr) 44px'));
 assert.ok(css.includes('gap:2px;min-width:0;overflow-x:auto;overflow-y:hidden'));
});
