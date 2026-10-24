import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createViewpointControlLayout} from '../viewpoint-controls.js';

test('every frame size uses the existing dock and resize never reparents or blurs its arrows',()=>{
 let width=320,height=300,moves=0;const utilities={append(node){node.parentNode=this;moves++;}},control={parentNode:utilities,onclick(){}},root={dataset:{},getBoundingClientRect(){throw Error('placement must not depend on screen size');}};
 const handler=control.onclick,layout=createViewpointControlLayout({root,utilities,control});
 for(width of [320,360,364,520,740,1024])for(height=300;height<=1000;height++){
  layout.refresh();assert.equal(control.parentNode,utilities,`${width}x${height}`);assert.equal(root.dataset.compactViewpoint,'true');assert.equal(control.onclick,handler);
 }
 assert.equal(moves,0);
});

test('a legacy misplaced selector moves once into the dock while preserving focus and handlers',()=>{
 let moved=0,restored=0;const doc={activeElement:null},arrow={focus(options){assert.deepEqual(options,{preventScroll:true});doc.activeElement=this;restored++;}},handler=()=>{},root={dataset:{}},utilities={append(node){doc.activeElement=null;node.parentNode=this;moved++;}},control={parentNode:root,ownerDocument:doc,contains:node=>node===arrow,onclick:handler};
 doc.activeElement=arrow;const layout=createViewpointControlLayout({root,utilities,control});layout.refresh();assert.equal(doc.activeElement,arrow);assert.equal(control.onclick,handler);assert.equal(moved,1);assert.equal(restored,1);
 for(let resize=0;resize<10;resize++)layout.refresh();assert.equal(moved,1);assert.equal(restored,1);assert.equal(doc.activeElement,arrow);
});

for(const page of ['town','maze'])test(page+' HTML starts in the bottom utility slot with no floating placement rule',()=>{
 const html=fs.readFileSync(new URL(`../${page}/index.html`,import.meta.url),'utf8'),css=fs.readFileSync(new URL('../game-shell.css',import.meta.url),'utf8');
 const utility=page==='town'?'<div class="left-controls town-utilities">':'<aside class="lantern-dock" aria-label="視点の切り替え">';
 assert.ok(html.includes(utility+'<div class="viewpoint-control"'),'selector is docked even before JavaScript');assert.match(html,/<main[^>]+data-compact-viewpoint="true"/);
 assert.doesNotMatch(css,/>\.viewpoint-control\s*\{/);assert.match(css,/grid-template-columns:repeat\(2,minmax\(44px,1fr\)\)/);assert.match(css,/min-width:44px;min-height:44px/);
});
