import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {questions,AUTO} from '../catalog.js?v=28.0.2';
import {applyCollection} from '../collection.js?v=28.0.2';

// Execute the application statement itself: an independent filter helper would
// miss a regression in generate() that reintroduces hidden profile suggestions.
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const statements=source.split('\n').filter(line=>line.trimStart().startsWith('if(input.theme===AUTO&&profile.inspiration?.themes?.length)'));
assert.equal(statements.length,1,'Find exactly one actual profile-theme assignment');
const assignment=new vm.Script(statements[0],{filename:'app.js:profile-theme-assignment'});

let checks=0;
function assignTheme({collection='halloween',theme=AUTO,themes,random=0,extraInput={}}={}){
 applyCollection(collection);
 const input={...extraInput,theme};
 const profile=themes===undefined?{}:{inspiration:{themes:[...themes],labels:['test creator'],objects:['test object']}};
 const before=structuredClone(profile);
 let randomCalls=0;
 assignment.runInContext(vm.createContext({input,profile,collection,questions,AUTO,rng(){randomCalls++;return random;}}));
 assert.deepEqual(profile,before,'Selecting inspiration must not change the creator profile or its legacy suggestions');
 checks++;
 return {input,randomCalls};
}

try{
 applyCollection('halloween');
 const publicThemes=questions.find(q=>q.key==='theme').groups.flatMap(group=>group.values);
 const publicSet=new Set(publicThemes);
 assert.equal(publicThemes.length,29,'Current Halloween public scene count');
 assert.equal(publicSet.size,29,'Public scenes must be distinct');
 const removedThemes=['秘密の図書館','星を集める旅','光と影の寓話','記憶の標本室','異世界のファッションショー','古城の大広間','雨の路地'];
 for(const theme of removedThemes)assert.ok(!publicSet.has(theme),theme+' must actually be absent from the public Halloween list');

 // Every current scene remains eligible, including the public place-based ones.
 for(const theme of publicThemes){
  const result=assignTheme({themes:[theme]});
  assert.equal(result.input.theme,theme,theme+' must remain a usable profile suggestion');
  assert.equal(result.randomCalls,1);
 }
 for(let index=0;index<publicThemes.length;index++){
  const result=assignTheme({themes:publicThemes,random:(index+.5)/publicThemes.length});
  assert.equal(result.input.theme,publicThemes[index],'Random selection must reach every one of the 29 public scenes');
 }

 // A profile containing only obsolete general fantasy/bare-location choices
 // must leave AUTO for the application's ordinary collection resolver.
 for(const themes of [removedThemes,...removedThemes.map(theme=>[theme]),[],undefined]){
  const result=assignTheme({themes});
  assert.equal(result.input.theme,AUTO,'No public suggestion must leave AUTO intact');
  assert.equal(result.randomCalls,0,'No replacement must consume no random choice');
 }
 const allowed=['宇宙のHalloween','幽霊たちのお茶会','魔女の書斎'];
 const mixed=[removedThemes[0],allowed[0],removedThemes[1],allowed[1],removedThemes[2],allowed[2],removedThemes[3]];
 for(const [random,expected] of [[0,allowed[0]],[.5,allowed[1]],[.999999,allowed[2]]]){
  const result=assignTheme({themes:mixed,random});
  assert.equal(result.input.theme,expected,'Filter obsolete entries before indexing the surviving public suggestions');
  assert.ok(publicSet.has(result.input.theme));
  assert.equal(result.randomCalls,1);
 }

 // The restriction is for Halloween AUTO suggestions only. Everyday preserves
 // its current profile suggestions, including labels absent from its UI pool.
 const normalSuggestions=['静かな読書の時間','profile-only ordinary scene','光と影の寓話'];
 for(let index=0;index<normalSuggestions.length;index++){
  const result=assignTheme({collection:'everyday',themes:normalSuggestions,random:(index+.5)/normalSuggestions.length});
  assert.equal(result.input.theme,normalSuggestions[index]);
  assert.equal(result.randomCalls,1);
 }

 // Explicit choices, restored history values, and free-form requests arrive
 // as concrete input.theme values and must not be rewritten by inspiration.
 for(const collection of ['halloween','everyday'])for(const [label,theme,extraInput] of [
  ['explicit public','宇宙のHalloween',{}],
  ['explicit legacy','秘密の図書館',{}],
  ['history legacy place','雨の路地',{sceneUnified:true,place:'雨の路地',edition:'SAVED-EDITION'}],
  ['custom','雲上の郵便局で失った手紙を探す夜',{sceneUnified:true,custom:true}]
 ]){
  const result=assignTheme({collection,theme,themes:mixed,random:.999999,extraInput});
  assert.equal(result.input.theme,theme,collection+' '+label+' must preserve the concrete theme');
  assert.equal(result.randomCalls,0,'Explicit/history/custom values must not consume inspiration randomness');
  for(const [key,value] of Object.entries(extraInput))assert.equal(result.input[key],value,'Keep restored/custom input metadata');
 }
}finally{
 applyCollection('halloween');
}

console.log('PASS '+checks+' actual app.js inspiration cases: all 29 public Halloween scenes remain eligible, obsolete-only suggestions retain AUTO, mixed suggestions filter before random selection, everyday suggestions and explicit/history/custom values remain unchanged.');
