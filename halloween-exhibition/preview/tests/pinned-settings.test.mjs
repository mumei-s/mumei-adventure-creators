import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
const html=await read('index.html'),css=await read('compact-gallery-header.css');
function paths(){const stack=[],found={};for(const m of html.matchAll(/<\/?([a-z][\w-]*)\b([^>]*)>/gi)){const [tag,name,attrs]=m;if(tag.startsWith('</')){stack.pop();continue;}const id=attrs.match(/\bid="([^"]+)"/)?.[1],classes=attrs.match(/\bclass="([^"]+)"/)?.[1]||'';if(id)found[id]=stack.map(x=>x.classes);if(!/^(meta|link|img|input|br|hr|source)$/i.test(name))stack.push({name,classes});}return found;}
test('primary buttons keep their real DOM groups while CSS reserves separate install and settings cells',async()=>{
 const p=paths();for(const id of ['mode-halloween','mode-normal','year-open','list-open']){assert.ok(p[id].includes('toolbar-primary'),id);assert.ok(p[id].includes('header-actions'),id);}
 assert.equal((html.match(/class="header-actions"/g)||[]).length,1);
 assert.equal((html.match(/class="toolbar-primary"/g)||[]).length,1);
 const app=await read('theater.js');assert.ok(app.includes("triggerParent:document.querySelector('.header-actions')"));
 const settings=await read('visitor-preferences.js');assert.ok(settings.includes('(triggerParent || document.body).append(trigger)'));
 assert.match(css,/\.header-actions,\s*[^{}]+\.toolbar-primary,\s*[^{}]+\.header-navigation,\s*[^{}]+\.mode-switch\{display:contents\}/);
 assert.match(css,/\.visitor-settings-trigger\{grid-column:6;grid-row:1/);
 assert.match(css,/#atelier-install-panel\{\s*grid-column:5;grid-row:1/);
 assert.doesNotMatch(css,/overflow(?:-x)?:\s*(?:auto|scroll)/);
});
test('all six grid cells fit physical narrow screens with measured mode and list label widths',()=>{
 // Prior DOM Range measurements at16px are a conservative static width check,
 // not a claim that a browser was rendered at every viewport/profile choice.
 const template=css.match(/\.palace-toolbar\s*\{[^}]*grid-template-columns:([^;]+);/)?.[1];
 const tracks=[...template.matchAll(/minmax\((\d+)px,([\d.]+)fr\)|(\d+)px/g)].map(match=>match[3]?{min:Number(match[3]),fr:0}:{min:Number(match[1]),fr:Number(match[2])});
 assert.equal(tracks.length,6);
 function resolvedTracks(content){
  const widths=tracks.map(track=>track.fr?null:track.min);let available=content-5*2-tracks.filter(track=>!track.fr).reduce((sum,track)=>sum+track.min,0),open=tracks.map((track,index)=>track.fr?index:null).filter(index=>index!==null);
  while(open.length){const unit=available/open.reduce((sum,index)=>sum+tracks[index].fr,0),limited=open.filter(index=>unit*tracks[index].fr<tracks[index].min);
   if(!limited.length){for(const index of open)widths[index]=unit*tracks[index].fr;break;}
   for(const index of limited){widths[index]=tracks[index].min;available-=widths[index];}open=open.filter(index=>!limited.includes(index));
  }
  return widths;
 }
 for(const width of[294,320,344,360,390,430,480]){
  const content=width-16,widths=resolvedTracks(content),font=width<330?11:Math.max(12,Math.min(width*.034,14));
  assert.ok(widths.reduce((sum,n)=>sum+n,0)+10<=content+.001);
  assert.ok(79.640625*font/16+6<=widths[0],`${width}: Halloween text, padding and border fit`);
  assert.ok(80.015625*font/16+4<=widths[3],`${width}: participant-list text fits`);
  assert.equal(widths[4],44);assert.equal(widths[5],40,'settings retains its own rightmost slot');
 }
});
