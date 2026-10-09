import {sourceKinds,sourceSubjectFor} from '../source-kind.js?v=28.4.6';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {questions} from '../catalog.js?v=28.4.6';
import {applyCollection,currentCollection} from '../collection.js?v=28.4.6';
import {initialSelections,modeKeys,modeCopy} from '../modes.js?v=28.4.6';

// Execute the real switch function. Pool-only tests missed a removed helper
// that still ran before both initial mode restoration and every button click.
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const collectionSource=source.slice(source.indexOf('function setCollection('),source.indexOf("\nlet mainCollection=",source.indexOf('function setCollection(')));
const modeSource=source.slice(source.indexOf('function setMode('),source.indexOf('\nfunction makeProposals(',source.indexOf('function setMode(')));
assert.ok(collectionSource.startsWith('function setCollection('));
assert.ok(modeSource.startsWith('function setMode('));

function element(){return {textContent:'',hidden:false,dataset:{},attributes:{},children:[],replaceChildren(...nodes){this.children=nodes;},setAttribute(key,value){this.attributes[key]=value;}};}
function application(){
 const nodes=new Map(),buttons=['halloween','everyday'].map(collection=>Object.assign(element(),{dataset:{collection}}));
 const modeButtons=['detail','simple','auto'].map(mode=>Object.assign(element(),{dataset:{mode}}));
 const storage=new Map(),document={body:element(),title:'',createTextNode:text=>({textContent:text}),querySelectorAll:selector=>selector==='.collection-switch button'?buttons:selector==='.mode-switch button'?modeButtons:[]};
 const state=initialSelections();
 const context=vm.createContext({sourceKinds,sourceSubjectFor,sourceKind:'unknown',collection:'halloween',collectionSnapshots:{},mode:'detail',selections:state,modeSnapshots:{detail:{...state}},proposals:[],selectedProposal:null,motion:false,boardArtKey:'old',document,structuredClone,applyCollection,initialSelections,modeKeys,modeCopy,$:id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},el:(tag,cls,text)=>({tag,cls,textContent:text}),setMotion(){},renderChoices(){},makeProposals(){},syncProfilePreview(){},effects:{refresh(){}},localStorage:{setItem:(key,value)=>storage.set(key,value)}});
 vm.runInContext(collectionSource+'\n'+modeSource,context);
 return {context,nodes,buttons,storage};
}

try{
 applyCollection('halloween');
 const {context,nodes,buttons,storage}=application();
 assert.doesNotThrow(()=>vm.runInContext("setCollection('everyday')",context),'Everyday restoration must start without any removed profile/idea helper');
 assert.equal(context.document.body.dataset.collection,'everyday');
 assert.equal(currentCollection(),'everyday');
 assert.equal(storage.get('halloween-collection'),'everyday');
 assert.equal(buttons.find(b=>b.dataset.collection==='everyday').attributes['aria-pressed'],'true');
 assert.equal(nodes.get('tool-name').children[0].textContent,'イラスト工房');
 assert.ok(questions.find(q=>q.key==='theme').groups.some(g=>g.values.includes('静かな読書の時間')));
 assert.ok(questions.find(q=>q.key==='theme').groups.some(g=>g.values.includes('宇宙のHalloween')),'Everyday mode allows an explicitly selected seasonal scene');
 assert.ok(!questions.find(q=>q.key==='theme').autoValues.includes('宇宙のHalloween'),'Restored everyday AUTO must remain ordinary');

 context.selections.theme='静かな読書の時間';context.selections.costume='リネンシャツとデニム';
 context.selections.size='横16:9｜3840×2160｜16:9';
 vm.runInContext("setCollection('halloween')",context);
 assert.equal(context.document.body.dataset.collection,'halloween');
 assert.equal(currentCollection(),'halloween');
 assert.ok(questions.find(q=>q.key==='theme').groups.some(g=>g.values.includes('宇宙のHalloween')));
 context.selections.theme='宇宙のHalloween';
 vm.runInContext("setCollection('everyday')",context);
 assert.equal(context.selections.theme,'静かな読書の時間');
 assert.equal(context.selections.costume,'リネンシャツとデニム');
 assert.equal(context.selections.size,'横16:9｜3840×2160｜16:9');
 vm.runInContext("setCollection('halloween')",context);
 assert.equal(context.selections.theme,'宇宙のHalloween');

 const restored=application();
 vm.runInContext("setCollection('everyday')",restored.context);
 assert.equal(restored.context.document.body.dataset.collection,'everyday','Saved everyday mode must also start in a fresh page session');
 console.log('PASS collection startup: saved everyday starts, buttons switch both directions, matching catalogs and labels update, and each mode retains its selected scene/costume/size.');
}finally{applyCollection('halloween');}
