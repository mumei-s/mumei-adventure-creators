import fs from 'node:fs';
import assert from 'node:assert/strict';
import {questions,resolveSelections} from '../catalog.js?v=28.2.0';
import {applyCollection,dailyScenes,dailyClothes,dailyInspiration} from '../collection.js?v=28.2.0';
import {profileForArtwork} from '../activity-settings.js?v=28.2.0';
import {selectedRecipes} from '../recipes.js?v=28.2.0';
import {propose,initialSelections} from '../modes.js?v=28.2.0';
import {buildDirection} from '../direction.js?v=28.2.0';
import {composePrompt} from '../prompt.js?v=28.2.0';
const profile={displayName:'Alice',biography:'子育てと写真',topics:['子育て','写真'],titles:['子育ての記事'],bodyRead:{status:'complete'},inspiration:{labels:['家族と暮らし','写真と記憶'],themes:['幽霊たちのお茶会'],phrases:['夜の思い出'],objects:['カボチャ'],signals:[{label:'家族と暮らし',theme:'幽霊たちのお茶会',imagery:'家族の記憶',phrases:['一緒に物語を']},{label:'写真と記憶',theme:'記憶の標本室',imagery:'写真の断片',phrases:['光の記憶']}]}},off=profileForArtwork(profile,false);
assert.equal(off.displayName,'Alice');assert.equal(off.biography,'');assert.deepEqual(off.topics,[]);assert.equal(off.inspiration,null);
const defaultProfile=profileForArtwork(profile,true);assert.deepEqual(defaultProfile.topics,[]);assert.equal(defaultProfile.tagsEnabled,false);assert.equal(defaultProfile.biography,profile.biography);assert.deepEqual(defaultProfile.inspiration,profile.inspiration);const filtered=profileForArtwork(profile,true,new Set(['子育て']),{tagsEnabled:true});assert.deepEqual(filtered.topics,['写真']);assert.equal(filtered.biography,profile.biography);assert.deepEqual(filtered.titles,profile.titles);assert.deepEqual(filtered.inspiration.labels,['家族と暮らし','写真と記憶']);
applyCollection('everyday');assert.equal(questions.length,12);const pools=Object.fromEntries(questions.map(q=>[q.key,q.groups.flatMap(g=>g.values)]));assert.ok(!pools.type.some(v=>v.includes('HALLOWEEN')));assert.ok(!pools.theme.includes('幽霊たちのお茶会'));
for(const [key,values]of [['theme',dailyScenes.map(x=>x[0])],['costume',dailyClothes]])for(const value of values){const recipe=selectedRecipes({...resolveSelections({}),[key]:value}).find(r=>r.key===key);assert.ok(recipe.file?.startsWith('japan-everyday-'));assert.ok(fs.existsSync(new URL('../'+recipe.file,import.meta.url)));assert.ok(recipe.text.length>20);}
for(let i=0;i<100;i++){const values=propose(initialSelections(),Math.random);assert.ok(pools.theme.includes(values.theme));assert.ok(pools.costume.includes(values.costume));assert.ok(pools.line.includes(values.line));const v=buildDirection([],'毎回大胆に変える',Math.random,'everyday'),p=composePrompt({collection:'everyday',creator:'alice',profile:dailyInspiration(filtered),values,variant:v,references:[],edition:'DAILY'});assert.match(p,/作品モード】普段使い/);assert.ok(!p.includes('HALLOWEEN SPECIAL'));assert.ok(!p.includes('幽霊たちのお茶会＋星空の砂漠'));assert.ok(!v.pose.includes('マント'));}
applyCollection('halloween');assert.equal(questions.reduce((n,q)=>n+q.groups.flatMap(g=>g.values).length,0),579);assert.ok(questions.find(q=>q.key==='costume').groups.flatMap(g=>g.values).includes('ゾンビ'));
console.log('PASS contracts: independent article context and optional tag exclusions, 12 everyday scene/clothing bindings to 8 Japanese samples, 100 everyday auto proposals and prompt outputs, full Halloween catalogue restored.');
